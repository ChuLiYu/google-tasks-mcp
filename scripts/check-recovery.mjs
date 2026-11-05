// Synthetic-only release rehearsal. No user paths, credentials, or network clients.
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, EncryptedVault } from '../dist/storage/index.js';
import { hash } from '../dist/domain/index.js';
import { DemoTasks, DEMO_LIST } from '../dist/demo/index.js';
import { TaskService } from '../dist/service/index.js';

const ctx = { principal: 'rehearsal-A', connection: 'synthetic-A' };
const other = { principal: 'rehearsal-B', connection: 'synthetic-B' };
const input = key => ({ taskListId: DEMO_LIST, title: 'Synthetic recovery fixture', idempotencyKey: key });
async function proposal(service, args) {
  try { await service.call('create_task', args); }
  catch (error) {
    assert.equal(error.code, 'APPROVAL_REQUIRED');
    assert.equal(typeof error.details.operationRef, 'string');
    return error.details.operationRef;
  }
  assert.fail('Unapproved write succeeded');
}

if (process.argv[2] === '--child') {
  assert.ok(process.send, 'Child requires IPC');
  const store = new Store(join(process.argv[3], 'source.sqlite'));
  const adapter = new DemoTasks(store);
  const service = new TaskService(adapter, store, ctx, [DEMO_LIST]);
  store.approve(await proposal(service, input('success'))); // Simulated approval, never human evidence.
  await service.call('create_task', input('success'));
  store.approve(await proposal(service, input('crash')));
  const create = adapter.create.bind(adapter);
  adapter.create = async (...args) => {
    await create(...args); // Persist synthetic upstream side effect before losing response.
    process.send({ phase: 'upstream-written' });
    await new Promise(() => {});
  };
  // Keep the process alive until the parent performs an actual SIGKILL.
  setInterval(() => {}, 1000);
  await service.call('create_task', input('crash'));
} else {
  assert.equal(process.argv.length, 2, 'No user paths or arguments accepted');
  const dir = mkdtempSync(join(tmpdir(), 'tasks-recovery-'));
  let child;
  let timer;
  let store;
  try {
    const path = join(dir, 'source.sqlite');
    child = fork(fileURLToPath(import.meta.url), ['--child', dir], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    const phase = new Promise((resolve, reject) => {
      child.once('message', value => value?.phase === 'upstream-written' ? resolve() : reject(new Error('Unexpected phase')));
      child.once('error', reject);
      child.once('exit', () => reject(new Error('Child exited before crash injection')));
      timer = setTimeout(() => reject(new Error('Crash rehearsal timed out')), 15_000);
    });
    await phase;
    clearTimeout(timer);
    const exited = once(child, 'exit');
    assert.ok(child.kill('SIGKILL'));
    const [code, signal] = await exited;
    assert.equal(code, null);
    assert.equal(signal, 'SIGKILL');
    store = new Store(path);
    assert.equal(store.db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(store.proposal(ctx, 'create_task', 'crash', input('crash')).state, 'in_flight');
    store.recoverInterrupted();
    assert.equal(store.proposal(ctx, 'create_task', 'crash', input('crash')).state, 'uncertain');
    const adapter = new DemoTasks(store);
    let writes = 0;
    const create = adapter.create.bind(adapter);
    adapter.create = async (...args) => { writes++; return create(...args); };
    const service = new TaskService(adapter, store, ctx, [DEMO_LIST]);
    const first = await service.call('create_task', input('success'));
    for (let n = 0; n < 20; n++) {
      await assert.rejects(service.call('create_task', input('crash')), { code: 'WRITE_OUTCOME_UNKNOWN' });
      assert.deepEqual(await service.call('create_task', input('success')), first);
    }
    assert.equal(writes, 0);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM demo_tasks').get().n, 207);
    await assert.rejects(new TaskService(adapter, store, other, [DEMO_LIST]).call('create_task', input('success')), { code: 'APPROVAL_REQUIRED' });
    const cursor = store.cursor(ctx, 'fixture', { page: 2 });
    const key = Buffer.alloc(32, 7); // Public synthetic key only.
    new EncryptedVault(store, key).put('fixture', { value: 'synthetic secret' });
    const backup = join(dir, 'backup.sqlite');
    store.db.prepare('VACUUM INTO ?').run(backup);
    // Demonstrate why an older backup cannot replace a live idempotency ledger.
    store.proposal(ctx, 'create_task', 'after-backup', input('after-backup'));
    store.close();
    store = undefined;
    const restored = join(dir, 'restored.sqlite');
    copyFileSync(backup, restored);
    store = new Store(restored);
    assert.equal(store.db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    store.recoverInterrupted();
    assert.equal(store.proposal(ctx, 'create_task', 'crash', input('crash')).state, 'uncertain');
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM operations WHERE key=?').get(hash('after-backup')).n, 0);
    const restoredAdapter = new DemoTasks(store);
    restoredAdapter.create = async () => { assert.fail('Restore caused a repeated write'); };
    const restoredService = new TaskService(restoredAdapter, store, ctx, [DEMO_LIST]);
    assert.deepEqual(await restoredService.call('create_task', input('success')), first);
    await assert.rejects(restoredService.call('create_task', input('crash')), { code: 'WRITE_OUTCOME_UNKNOWN' });
    await assert.rejects(new TaskService(restoredAdapter, store, other, [DEMO_LIST]).call('create_task', input('success')), { code: 'APPROVAL_REQUIRED' });
    assert.deepEqual(store.readCursor(ctx, 'fixture', cursor), { page: 2 });
    assert.throws(() => store.readCursor(other, 'fixture', cursor), { code: 'INVALID_CURSOR' });
    assert.deepEqual(new EncryptedVault(store, key).get('fixture'), { value: 'synthetic secret' });
    assert.throws(() => new EncryptedVault(store, Buffer.alloc(32, 8)).get('fixture'));
    console.log(JSON.stringify({ mode: 'synthetic-recovery', sigkill: true, uncertainBlocksReplay: true,
      successReplayWithoutWrite: true, snapshotRestore: true, accountIsolation: true,
      vaultNeedsOriginalKey: true, staleBackupLosesNewLedger: true, realGoogleRequested: false }));
  } finally {
    clearTimeout(timer);
    if (child && child.exitCode === null && child.signalCode === null) {
      const stopped = once(child, 'exit');
      child.kill('SIGKILL');
      await stopped;
    }
    store?.close();
    rmSync(dir, { recursive: true, force: true }); // Only this invocation's mkdtemp directory.
  }
}

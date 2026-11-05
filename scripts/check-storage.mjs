// Synthetic-only driver compatibility, independent connections and real lock timeout.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { Store, EncryptedVault } from '../dist/storage/index.js';
import { hash } from '../dist/domain/index.js';

const ctx = { principal: 'storage-A', connection: 'synthetic-A' };
const other = { principal: 'storage-B', connection: 'synthetic-B' };
if (!isMainThread) {
  const store = new Store(workerData.path);
  if (workerData.mode === 'lock') {
    store.db.exec('BEGIN IMMEDIATE');
    parentPort.postMessage('locked');
    const latch = new Int32Array(workerData.latch);
    // Bound the lock even when the parent fails before releasing it.
    Atomics.wait(latch, 0, 0, 15_000);
    store.db.exec('ROLLBACK');
    store.close();
  } else {
    parentPort.once('message', () => {
      try { parentPort.postMessage({ claimed: store.claim(workerData.ref) }); }
      finally { store.close(); }
    });
    parentPort.postMessage('ready');
  }
} else {
  assert.equal(process.argv.length, 2, 'No user paths or arguments accepted');
  const dir = mkdtempSync(join(tmpdir(), 'tasks-storage-'));
  const path = join(dir, 'state.sqlite');
  const workers = [];
  let store;
  let legacy;
  let latch;
  function message(worker) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => fail(new Error('Storage worker response timed out')), 20_000);
      function cleanup() {
        clearTimeout(timer);
        worker.off('message', receive); worker.off('error', fail); worker.off('exit', exited);
      }
      function receive(value) { cleanup(); resolve(value); }
      function fail(error) { cleanup(); reject(error); }
      function exited(code) { fail(new Error(`Storage worker exited before response: ${code}`)); }
      worker.once('message', receive); worker.once('error', fail); worker.once('exit', exited);
    });
  }
  function start(data) {
    const worker = new Worker(new URL(import.meta.url), { workerData: { path, ...data } });
    workers.push(worker);
    const exit = once(worker, 'exit').then(([code]) => assert.equal(code, 0));
    // Attach immediately so an early failure is handled while other workers start.
    exit.catch(() => {});
    return { worker, exit };
  }
  try {
    store = new Store(':memory:');
    const binding = { tool: 'search', list: 'synthetic-list' };
    const cursor = store.cursor(ctx, binding, { page: 'next' });
    const key = Buffer.alloc(32, 7);
    const vault = new EncryptedVault(store, key);
    vault.put('fixture', { token: 'synthetic-only' });
    const original = store.proposal(ctx, 'create_task', 'compatibility', { title: 'synthetic' });
    const approved = store.proposal(ctx, 'create_task', 'old-approved', { title: 'synthetic' });
    store.approve(approved.ref);
    // The previous driver creates the first on-disk file. Obtain the unchanged
    // schema and fixtures from an in-memory Store; never duplicate its DDL.
    legacy = new DatabaseSync(path);
    const quote = name => `"${name.replaceAll('"', '""')}"`;
    for (const table of store.db.prepare("SELECT name,sql FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()) {
      legacy.exec(table.sql);
      for (const row of store.db.prepare(`SELECT * FROM ${quote(table.name)}`).all()) {
        const columns = Object.keys(row);
        legacy.prepare(`INSERT INTO ${quote(table.name)} (${columns.map(quote).join(',')}) VALUES (${columns.map(() => '?').join(',')})`).run(...Object.values(row));
      }
    }
    store.close(); store = undefined;
    assert.equal(legacy.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(legacy.prepare('SELECT ref FROM operations WHERE key=?').get(hash('compatibility')).ref, original.ref);
    legacy.prepare("UPDATE operations SET state='in_flight' WHERE ref=?").run(original.ref);
    const ciphertext = legacy.prepare('SELECT value FROM secrets WHERE id=?').get('fixture').value;
    legacy.prepare('INSERT INTO secrets VALUES(?,?)').run('legacy-copy', ciphertext);
    legacy.close(); legacy = undefined;

    store = new Store(path);
    assert.equal(statSync(path).mode & 0o777, 0o600);
    assert.equal(store.db.pragma('journal_mode', { simple: true }), 'delete');
    assert.equal(store.db.pragma('synchronous', { simple: true }), 2);
    assert.equal(store.db.pragma('busy_timeout', { simple: true }), 5000);
    store.recoverInterrupted();
    assert.equal(store.proposal(ctx, 'create_task', 'compatibility', { title: 'synthetic' }).state, 'uncertain');
    assert.deepEqual(store.readCursor(ctx, binding, cursor), { page: 'next' });
    assert.throws(() => store.readCursor(other, binding, cursor), { code: 'INVALID_CURSOR' });
    assert.deepEqual(new EncryptedVault(store, key).get('legacy-copy'), { token: 'synthetic-only' });
    assert.equal(store.claim(approved.ref), true, 'An old-driver persisted approval must survive upgrade');
    assert.equal(store.claim(approved.ref), false);
    assert.throws(() => store.proposal(ctx, 'create_task', 'compatibility', { title: 'changed' }), { code: 'IDEMPOTENCY_CONFLICT' });
    const op = store.proposal(ctx, 'create_task', 'concurrent', { title: 'synthetic' });
    store.approve(op.ref); // Simulated, not human acceptance evidence.
    const contenders = Array.from({ length: 20 }, () => start({ mode: 'claim', ref: op.ref }));
    await Promise.all(contenders.map(async ({ worker }) => {
      const ready = await message(worker);
      assert.equal(ready, 'ready');
    }));
    const results = contenders.map(({ worker }) => message(worker));
    contenders.forEach(({ worker }) => worker.postMessage('claim'));
    assert.equal((await Promise.all(results)).filter(value => value.claimed === true).length, 1);
    await Promise.all(contenders.map(item => item.exit));

    const blocked = store.proposal(ctx, 'create_task', 'lock-timeout', { title: 'synthetic' });
    store.approve(blocked.ref);
    latch = new Int32Array(new SharedArrayBuffer(4));
    const holder = start({ mode: 'lock', latch: latch.buffer });
    assert.equal(await message(holder.worker), 'locked');
    const before = performance.now();
    assert.throws(() => store.claim(blocked.ref), { code: 'SQLITE_BUSY' });
    const elapsed = performance.now() - before;
    assert.ok(elapsed >= 4500 && elapsed < 12_000, `Unexpected busy wait: ${elapsed}ms`);
    Atomics.store(latch, 0, 1); Atomics.notify(latch, 0);
    await holder.exit;
    assert.equal(store.proposal(ctx, 'create_task', 'lock-timeout', { title: 'synthetic' }).state, 'pending');
    assert.equal(store.claim(blocked.ref), true, 'Timeout must not consume the approval');
    store.finish(blocked.ref, 'success', { id: 'synthetic-result' });
    store.close(); store = undefined;
    legacy = new DatabaseSync(path);
    assert.equal(legacy.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(legacy.prepare('SELECT state FROM operations WHERE ref=?').get(blocked.ref).state, 'success');
    console.log('Storage rehearsal passed: cross-driver round trip, isolation, 20 independent claims, 5s lock timeout without state loss. Synthetic only.');
  } finally {
    if (latch) { Atomics.store(latch, 0, 1); Atomics.notify(latch, 0); }
    await Promise.all(workers.map(worker => worker.terminate()));
    legacy?.close(); store?.close();
    rmSync(dir, { recursive: true, force: true });
  }
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, chmodSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Disposable fake client/docker only: never reads credentials or contacts OpenAI.
test('launcher loads only a private readonly key file and refuses unsafe input', () => {
  const root = mkdtempSync(join(tmpdir(), 'tasks-launcher-'));
  try {
    for (const path of ['scripts', 'bin', '.host/tools', '.host/tunnel/profiles']) mkdirSync(join(root, path), { recursive: true, mode: 0o700 });
    copyFileSync(new URL('./start-private-tunnel.zsh', import.meta.url), join(root, 'scripts/start-private-tunnel.zsh'));
    const executable = (path, content) => { writeFileSync(join(root, path), content); chmodSync(join(root, path), 0o700); };
    executable('bin/docker', '#!/bin/sh\nexit 0\n');
    executable('.host/tools/tunnel-client-v0.0.18', '#!/bin/sh\n[ "$CONTROL_PLANE_API_KEY" = "synthetic-test-key" ] || exit 9\nprintf "FAKE_CLIENT_STARTED\\n"\n');
    for (const profile of ['google-tasks-readonly', 'tasks-synthetic-approval-test']) writeFileSync(join(root, `.host/tunnel/profiles/${profile}.yaml`), '');
    const envPath = join(root, '.env');
    const run = (profile = 'readonly') => spawnSync('/bin/zsh', [join(root, 'scripts/start-private-tunnel.zsh'), profile], {
      encoding: 'utf8', timeout: 5000,
      env: { PATH: `${join(root, 'bin')}:/usr/bin:/bin`, CONTROL_PLANE_API_KEY: 'inherited-wrong-key' },
    });
    const save = (value, mode = 0o600) => { writeFileSync(envPath, value); chmodSync(envPath, mode); };
    save('# local fixture\nGOOGLE_TASKS_TUNNEL_API_KEY=synthetic-test-key');
    const good = run();
    assert.equal(good.status, 0, good.stderr);
    assert.match(good.stdout, /FAKE_CLIENT_STARTED/);
    assert.doesNotMatch(good.stdout + good.stderr, /synthetic-test-key|inherited-wrong-key/);
    assert.notEqual(run('synthetic').status, 0, 'synthetic must ignore readonly credentials');
    chmodSync(join(root, '.host/tunnel'), 0o777);
    assert.notEqual(run().status, 0, 'readonly must refuse a shared directory before using the key');
    chmodSync(join(root, '.host/tunnel'), 0o700);
    for (const legacy of ['.data/tools', '.data/tunnel']) {
      mkdirSync(join(root, legacy), { recursive: true });
      const refused = run();
      assert.notEqual(refused.status, 0, legacy + ' must be refused');
      assert.doesNotMatch(refused.stdout, /FAKE_CLIENT_STARTED/);
      rmSync(join(root, legacy), { recursive: true });
    }
    save('GOOGLE_TASKS_TUNNEL_API_KEY=synthetic-test-key\n', 0o644);
    assert.notEqual(run().status, 0, 'world-readable secrets must fail');
    save('GOOGLE_TASKS_TUNNEL_API_KEY=synthetic-test-key\n', 0o620);
    assert.notEqual(run().status, 0, 'group-writable secrets must fail');
    for (const value of [
      '', 'GOOGLE_TASKS_TUNNEL_API_KEY=\n',
      'UNEXPECTED_KEY=synthetic-test-key\n',
      'GOOGLE_TASKS_TUNNEL_API_KEY=synthetic-test-key\nGOOGLE_TASKS_TUNNEL_API_KEY=duplicate\n',
      `GOOGLE_TASKS_TUNNEL_API_KEY=$(touch ${join(root, 'executed')})\n`,
    ]) {
      save(value);
      assert.notEqual(run().status, 0);
      assert.equal(existsSync(join(root, 'executed')), false, 'file contents must not execute');
    }
    rmSync(envPath);
    assert.notEqual(run().status, 0, 'inherited key must not be reused');
    save('GOOGLE_TASKS_TUNNEL_API_KEY=synthetic-test-key\n');
    copyFileSync(envPath, join(root, 'other'));
    rmSync(envPath);
    symlinkSync(join(root, 'other'), envPath);
    assert.notEqual(run().status, 0, 'symlink must fail');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,chmodSync,readFileSync,rmSync,symlinkSync,existsSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('shared launcher prepares safe references, cleans failed Tunnel and refuses unsafe secrets',()=>{
  const root=mkdtempSync(join(tmpdir(),'tasks-stack-'));
  try {
    for(const directory of ['scripts','.data','.host/tunnel/profiles','.host/tools','bin','containers']) mkdirSync(join(root,directory),{recursive:true,mode:0o700});
    for(const name of ['private-stack.py','start-private-tunnel.zsh']) copyFileSync(new URL(name,import.meta.url),join(root,'scripts',name));
    const save=(name,value,mode=0o600)=>{writeFileSync(join(root,name),value,{mode});chmodSync(join(root,name),mode);};
    for(const name of ['google-client.json','google.sqlite','vault.key']) save('.data/'+name,'synthetic');
    save('.host/tunnel/profiles/google-tasks-readonly.yaml','control_plane:\n  tunnel_id: tunnel_synthetic_fixture\n');
    save('.env','GOOGLE_TASKS_TUNNEL_API_KEY=synthetic-fixture-key\n');
    save('bin/docker','#!/bin/sh\nprintf "%s\\n" "$*" >> "'+join(root,'calls')+'"\nexit 0\n',0o700);
    save('.host/tools/tunnel-client-v0.0.18','#!/bin/sh\n[ "$CONTROL_PLANE_API_KEY" = synthetic-fixture-key ] || exit 7\nexit 3\n',0o700);
    const run=action=>spawnSync('/usr/bin/python3',[join(root,'scripts/private-stack.py'),action],{encoding:'utf8',timeout:10000,env:{PATH:join(root,'bin')+':/usr/bin:/bin'}});
    const start=run('start');
    assert.notEqual(start.status,0,'failed client must fail the supervisor');
    assert.match(readFileSync(join(root,'calls'),'utf8'),/stop/,'failed tunnel must stop its service');
    assert.equal(existsSync(join(root,'.host/private-stack.pid')),false);
    const key=readFileSync(join(root,'.data/private-http.token'),'utf8');
    assert.match(key,/^[a-f0-9]{64}$/);
    assert.doesNotMatch(start.stdout+start.stderr,/synthetic-fixture-key/);
    assert.equal((start.stdout+start.stderr).includes(key),false);
    const profile=readFileSync(join(root,'.host/tunnel/profiles/google-tasks-readonly-http.yaml'),'utf8');
    assert.match(profile,/url: http:\/\/127.0.0.1:3002\/mcp/);
    assert.equal(profile.includes(key),false);
    const shared=spawnSync('/bin/zsh',[join(root,'scripts/start-private-tunnel.zsh'),'shared'],{encoding:'utf8',env:{PATH:join(root,'bin')+':/usr/bin:/bin'}});
    assert.equal(shared.status,3,'mode-700 directory chain reaches synthetic Tunnel');
    const headers=run('headers');
    assert.equal(headers.status,0);
    assert.equal(JSON.parse(headers.stdout)['X-Tasks-Local-Key'],key);
    // Compose sends SIGTERM while startup is still in progress; cleanup must run.
    save('bin/docker','#!/bin/sh\nprintf "%s\\n" "$*" >> "'+join(root,'calls')+'"\ncase "$*" in *"up -d"*) kill -TERM "$PPID"; sleep 1;; esac\nexit 0\n',0o700);
    rmSync(join(root,'calls'));
    run('start');
    assert.match(readFileSync(join(root,'calls'),'utf8'),/stop/,'interrupted compose must be stopped');
    assert.equal(existsSync(join(root,'.host/private-stack.pid')),false);
    renameSync(join(root,'.host/tunnel/profiles'),join(root,'.host/tunnel/real-profiles'));
    symlinkSync(join(root,'.host/tunnel/real-profiles'),join(root,'.host/tunnel/profiles'));
    assert.notEqual(run('start').status,0,'symlink parent refused');
    rmSync(join(root,'.host/tunnel/profiles'));
    renameSync(join(root,'.host/tunnel/real-profiles'),join(root,'.host/tunnel/profiles'));
    chmodSync(join(root,'.host/tunnel'),0o770);
    assert.notEqual(run('start').status,0,'group-writable parent refused');
    chmodSync(join(root,'.host/tunnel'),0o700);
    chmodSync(join(root,'.data/private-http.token'),0o644);
    assert.notEqual(run('headers').status,0);
    chmodSync(join(root,'.data/private-http.token'),0o600);
    rmSync(join(root,'.data/private-http.token'));
    save('.data/other-token',key);
    symlinkSync(join(root,'.data/other-token'),join(root,'.data/private-http.token'));
    assert.notEqual(run('headers').status,0);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test('no container mount reaches the host-only directory',()=>{
  for(const file of ['google-compose.yaml','google-stdio.sh','google-connect.sh','compose.yaml','demo-stdio.sh']) {
    const text=readFileSync(new URL('../containers/'+file,import.meta.url),'utf8');
    assert.doesNotMatch(text,/- \.\.\/\.host|source=[^ ]*\.host/,file+' must not mount .host');
  }
});

import assert from 'node:assert/strict';
import { chmodSync,copyFileSync,existsSync,mkdirSync,mkdtempSync,readFileSync,rmSync,statSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

// Fake docker and connect script only: no network, no Google, no real Claude config.
function fixture() {
  const root=mkdtempSync(join(tmpdir(),'tasks-setup-'));
  for(const dir of ['scripts','containers','skills/tasks-calendar-planner','bin','home/Downloads']) mkdirSync(join(root,dir),{recursive:true});
  copyFileSync(new URL('../setup.sh',import.meta.url),join(root,'setup.sh'));
  copyFileSync(new URL('./setup-helper.mjs',import.meta.url),join(root,'scripts/setup-helper.mjs'));
  writeFileSync(join(root,'containers/google-compose.yaml'),'');
  writeFileSync(join(root,'skills/tasks-calendar-planner/SKILL.md'),'x');
  const exe=(name,body)=>{writeFileSync(join(root,name),body);chmodSync(join(root,name),0o700);};
  exe('containers/google-connect.sh',`#!/bin/sh\nprintf '%s\\n' "connect $*" >> "${root}/calls"\n: > "${root}/.data/vault.key"; : > "${root}/.data/google.sqlite"\n`);
  exe('bin/docker',`#!/bin/sh
printf '%s\\n' "$*" >> "${root}/calls"
case "$*" in
  *setup-helper.mjs*client*) exec "${process.execPath}" "${root}/scripts/setup-helper.mjs" client ;;
  *setup-helper.mjs*desktop*) for a in "$@"; do last=$a; done; exec "${process.execPath}" "${root}/scripts/setup-helper.mjs" desktop "$last" ;;
esac
exit \${FAKE_DOCKER_EXIT:-0}
`);
  exe('bin/pgrep','#!/bin/sh\nexit 1\n');
  const run=(answers,env={})=>spawnSync('/bin/sh',[join(root,'setup.sh')],{encoding:'utf8',input:answers,timeout:20000,
    env:{PATH:`${join(root,'bin')}:/usr/bin:/bin`,HOME:join(root,'home'),TASKS_DESKTOP_CONFIG:join(root,'home/config.json'),...env}});
  return {root,run,calls:()=>readFileSync(join(root,'calls'),'utf8')};
}
const client=JSON.stringify({installed:{client_id:'synthetic-id',client_secret:'SYNTHETIC-SECRET-VALUE'}});

test('full run keeps secrets private, defaults writes off and preserves the Claude config',()=>{
  const f=fixture();
  try {
    writeFileSync(join(f.root,'home/Downloads/client_secret_x.json'),client);
    writeFileSync(join(f.root,'home/config.json'),JSON.stringify({preferences:{keep:true}}));
    const result=f.run('\n\n\n');
    assert.equal(result.status,0,result.stderr+result.stdout);
    assert.doesNotMatch(result.stdout+result.stderr,/SYNTHETIC-SECRET-VALUE/);
    assert.equal(readFileSync(join(f.root,'.host/runtime.env'),'utf8'),'TASKS_REAL_WRITES=0\nTASKS_WRITE_APPROVAL=direct\n','Enter must mean no writes');
    assert.match(f.calls(),/^connect $/m,'read-only choice must not request write scope');
    for(const secret of ['.data/google-client.json','.data/private-http.token','.host/runtime.env']) assert.equal(statSync(join(f.root,secret)).mode&0o077,0,secret);
    assert.match(readFileSync(join(f.root,'.data/private-http.token'),'utf8'),/^[a-f0-9]{64}$/);
    const config=JSON.parse(readFileSync(join(f.root,'home/config.json'),'utf8'));
    assert.deepEqual(config.preferences,{keep:true});
    assert.equal(config.mcpServers['google-tasks'].command,'/bin/sh');
    assert.match(config.mcpServers['google-tasks'].args[0],/containers\/claude-desktop-stdio\.sh$/);
    assert.ok(existsSync(join(f.root,'home/config.json.bak')));
  } finally {rmSync(f.root,{recursive:true,force:true});}
});

test('choosing writes requests write scope and enables them',()=>{
  const f=fixture();
  try {
    writeFileSync(join(f.root,'home/Downloads/client_secret_x.json'),client);
    const result=f.run('\ny\nn\n');
    assert.equal(result.status,0,result.stderr+result.stdout);
    assert.equal(readFileSync(join(f.root,'.host/runtime.env'),'utf8'),'TASKS_REAL_WRITES=1\nTASKS_WRITE_APPROVAL=direct\n');
    assert.match(f.calls(),/^connect --write-test$/m);
    assert.equal(existsSync(join(f.root,'home/config.json')),false,'declining must not touch the Claude config');
  } finally {rmSync(f.root,{recursive:true,force:true});}
});

test('refuses a bad client file and a broken Claude config without changing them',()=>{
  const f=fixture();
  try {
    writeFileSync(join(f.root,'bad.json'),'{"not":"a client"}');
    const bad=f.run(join(f.root,'bad.json')+'\n');
    assert.notEqual(bad.status,0);
    assert.equal(existsSync(join(f.root,'.data/google-client.json')),false);
    writeFileSync(join(f.root,'good.json'),client);
    writeFileSync(join(f.root,'home/config.json'),'{broken');
    const broken=f.run(join(f.root,'good.json')+'\n\n\ny\n');
    assert.notEqual(broken.status,0);
    assert.equal(readFileSync(join(f.root,'home/config.json'),'utf8'),'{broken');
  } finally {rmSync(f.root,{recursive:true,force:true});}
});

test('stops with a clear message when Docker is not running',()=>{
  const f=fixture();
  try {
    const result=f.run('',{FAKE_DOCKER_EXIT:'1'});
    assert.notEqual(result.status,0);
    assert.match(result.stderr,/Docker is not running/);
    assert.equal(existsSync(join(f.root,'.data')),false);
  } finally {rmSync(f.root,{recursive:true,force:true});}
});

test('disconnect needs the exact word and runs only the disconnect entry',()=>{
  const f=fixture();
  try {
    const run=(answer)=>spawnSync('/bin/sh',[join(f.root,'setup.sh'),'disconnect'],{encoding:'utf8',input:answer,timeout:10000,env:{PATH:`${join(f.root,'bin')}:/usr/bin:/bin`,HOME:join(f.root,'home')}});
    assert.equal(run('yes\n').status,0);
    assert.equal(existsSync(join(f.root,'calls')),false,'a wrong word must do nothing');
    assert.equal(run('DISCONNECT\n').status,0);
    assert.match(f.calls(),/dist\/disconnect\.js/);
  } finally {rmSync(f.root,{recursive:true,force:true});}
});

test('rerunning setup keeps strict mode however the line is written',()=>{
  for(const line of ['TASKS_WRITE_APPROVAL=local','export TASKS_WRITE_APPROVAL=local','  TASKS_WRITE_APPROVAL="local"']) {
    const f=fixture();
    try {
      writeFileSync(join(f.root,'home/Downloads/client_secret_x.json'),client);
      mkdirSync(join(f.root,'.host'));writeFileSync(join(f.root,'.host/runtime.env'),`TASKS_REAL_WRITES=1\n${line}\n`);
      assert.equal(f.run('\ny\nn\n').status,0);
      assert.equal(readFileSync(join(f.root,'.host/runtime.env'),'utf8'),'TASKS_REAL_WRITES=1\nTASKS_WRITE_APPROVAL=local\n',line);
    } finally {rmSync(f.root,{recursive:true,force:true});}
  }
});

test('a failed disconnect does not claim credentials were removed',()=>{
  const f=fixture();
  try {
    const run=code=>spawnSync('/bin/sh',[join(f.root,'setup.sh'),'disconnect'],{encoding:'utf8',input:'DISCONNECT\n',timeout:10000,env:{PATH:`${join(f.root,'bin')}:/usr/bin:/bin`,HOME:join(f.root,'home'),FAKE_RUN_EXIT:code}});
    writeFileSync(join(f.root,'bin/docker'),'#!/bin/sh\ncase "$1" in run) exit ${FAKE_RUN_EXIT:-0};; esac\nexit 0\n');
    assert.match(run('3').stderr,/local credentials were removed, but remove Google access/);
    const other=run('1');
    assert.notEqual(other.status,0);
    assert.match(other.stderr,/nothing was removed/);
  } finally {rmSync(f.root,{recursive:true,force:true});}
});

test('Enter finds a client file downloaded while the prompt waits',()=>{
  const f=fixture();
  try {
    const none=f.run('\n');
    assert.notEqual(none.status,0);
    assert.match(none.stderr,/no client_secret file found/);
    writeFileSync(join(f.root,'home/Downloads/client_secret_late.json'),client);
    assert.equal(f.run('\nn\n\nn\n').status,0);
    assert.equal(existsSync(join(f.root,'.data/google-client.json')),true);
  } finally {rmSync(f.root,{recursive:true,force:true});}
});


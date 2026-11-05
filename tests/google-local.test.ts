import { it,expect,vi } from 'vitest';
import { mkdtempSync,writeFileSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EncryptedVault } from '../src/storage/index.js';

it.each([false,true])('requests write scope only for the explicit write-test option: %s',async(writeTest)=>{
  const dir=mkdtempSync(join(tmpdir(),'tasks-scope-'));
  vi.stubEnv('TASKS_DATA_DIR',dir);vi.resetModules();
  writeFileSync(join(dir,'google-client.json'),JSON.stringify({installed:{client_id:'synthetic-client'}}));
  const {googleLocal}=await import('../src/local/google-local.js');
  const runtime=writeTest ? googleLocal(true,true) : googleLocal(true);
  try {
    const url=new URL(runtime.oauth.start('local-os-owner').url);
    expect(url.searchParams.get('scope')).toBe(`https://www.googleapis.com/auth/tasks${writeTest ? '' : '.readonly'}`);
  }finally{runtime.store.close();vi.unstubAllEnvs();vi.resetModules();rmSync(dir,{recursive:true,force:true});}
});

it('an existing stdio service refuses tokens from a replacement connection',async()=>{
  const dir=mkdtempSync(join(tmpdir(),'tasks-local-'));
  vi.stubEnv('TASKS_DATA_DIR',dir);vi.resetModules();
  const {googleLocal}=await import('../src/local/google-local.js');
  writeFileSync(join(dir,'google-client.json'),JSON.stringify({installed:{client_id:'synthetic-client'}}));
  let runtime=googleLocal(true);
  const tokens={accessToken:'synthetic',expiresAt:Date.now()+60_000};
  new EncryptedVault(runtime.store,readFileSync(join(dir,'vault.key'))).put('local-google',{id:'connection-A',tokens});
  runtime.store.close();runtime=googleLocal();
  try {
    const service=runtime.service();
    new EncryptedVault(runtime.store,readFileSync(join(dir,'vault.key'))).put('local-google',{id:'connection-B',tokens});
    await expect(service.call('list_task_lists',{})).rejects.toMatchObject({code:'GOOGLE_REAUTH_REQUIRED'});
  }finally{runtime.store.close();vi.unstubAllEnvs();vi.resetModules();rmSync(dir,{recursive:true,force:true});}
});

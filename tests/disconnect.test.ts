import { mkdtempSync,existsSync,readFileSync,writeFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import { Store,EncryptedVault } from '../src/storage/index.js';
import { disconnect } from '../src/local/disconnect.js';

let dir:string,sent:string[];
const ok=async(_:unknown,init?:RequestInit)=>{sent.push(String(init?.body));return new Response(null,{status:200});};
function seed() {
  const key=randomBytes(32);writeFileSync(join(dir,'vault.key'),key,{mode:0o600});
  const store=new Store(join(dir,'google.sqlite'));
  new EncryptedVault(store,key).put('local-google',{id:'connection-A',tokens:{accessToken:'synthetic-access',refreshToken:'synthetic-refresh',expiresAt:1}});
  store.db.prepare('INSERT INTO secrets VALUES(?,?)').run('oauth:access:x','{}');
  store.db.prepare('INSERT INTO secrets VALUES(?,?)').run('snapshot:keep','{}');
  store.proposal({principal:'p',connection:'connection-A'},'create_task','kept-key',{title:'SYNTHETIC-PENDING-TITLE'});
  store.close();
}
const remaining=()=>{const store=new Store(join(dir,'google.sqlite'));try {return {secrets:(store.db.prepare('SELECT id FROM secrets ORDER BY id').all() as {id:string}[]).map(r=>r.id),operations:(store.db.prepare('SELECT count(*) n FROM operations').get() as {n:number}).n};} finally {store.close();}};
beforeEach(()=>{dir=mkdtempSync(join(tmpdir(),'tasks-disconnect-'));sent=[];});
afterEach(()=>{rmSync(dir,{recursive:true,force:true});});

describe('disconnect',()=>{
  it('revokes at Google, removes credentials and keeps the ledger',async()=>{
    seed();
    expect(await disconnect(dir,ok as typeof fetch)).toEqual({revoked:true,wasConnected:true});
    expect(sent).toEqual(['token=synthetic-refresh']);
    expect(existsSync(join(dir,'vault.key'))).toBe(false);
    expect(remaining()).toEqual({secrets:['snapshot:keep'],operations:1});
    expect(readFileSync(join(dir,'google.sqlite')).includes('synthetic-refresh')).toBe(false);
    expect(readFileSync(join(dir,'google.sqlite')).includes('SYNTHETIC-PENDING-TITLE')).toBe(false);
  });
  it('still removes credentials and reports it when Google cannot confirm',async()=>{
    for(const fetcher of [async()=>new Response(null,{status:400}),async()=>{throw new Error('offline');}]) {
      rmSync(dir,{recursive:true,force:true});dir=mkdtempSync(join(tmpdir(),'tasks-disconnect-'));seed();
      expect(await disconnect(dir,fetcher as typeof fetch)).toEqual({revoked:false,wasConnected:true});
      expect(existsSync(join(dir,'vault.key'))).toBe(false);
      expect(remaining().secrets).toEqual(['snapshot:keep']);
    }
  });
  it('does nothing when never connected, and removes an unreadable connection',async()=>{
    expect(await disconnect(dir,ok as typeof fetch)).toEqual({revoked:false,wasConnected:false});
    seed();writeFileSync(join(dir,'vault.key'),randomBytes(32));
    expect(await disconnect(dir,ok as typeof fetch)).toEqual({revoked:false,wasConnected:true});
    expect(sent).toEqual([]);
    expect(remaining().secrets).toEqual(['snapshot:keep']);
  });
});

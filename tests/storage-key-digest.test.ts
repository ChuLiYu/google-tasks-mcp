import { mkdtempSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { describe,expect,it } from 'vitest';
import { hash,type Context } from '../src/domain/index.js';
import { Store } from '../src/storage/index.js';

const ctx:Context={principal:'owner',connection:'connection-A'};
describe('operation key digest',()=>{
  it('migrates raw keys once, survives a lost user_version and keeps replay protection',()=>{
    const dir=mkdtempSync(join(tmpdir(),'tasks-keys-')),path=join(dir,'ledger.sqlite');
    try {
      let store=new Store(path);
      const first=store.proposal(ctx,'create_task','Buy milk at the store',{title:'x'});
      store.close();
      const raw=new Database(path);
      expect((raw.prepare('SELECT key FROM operations').get() as {key:string}).key).toBe(hash('Buy milk at the store'));
      // Simulate an older ledger, then a logical restore that loses the version.
      raw.prepare('UPDATE operations SET key=?').run('Buy milk at the store');raw.pragma('user_version=0');raw.close();
      store=new Store(path);expect(store.proposal(ctx,'create_task','Buy milk at the store',{title:'x'}).ref).toBe(first.ref);store.close();
      const again=new Database(path);again.pragma('user_version=0');again.close();
      store=new Store(path);expect(store.proposal(ctx,'create_task','Buy milk at the store',{title:'x'}).ref).toBe(first.ref);store.close();
    } finally {rmSync(dir,{recursive:true,force:true});}
  });
});

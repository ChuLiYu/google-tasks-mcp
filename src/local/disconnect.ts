import { existsSync,readFileSync,rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { Store,EncryptedVault } from '../storage/index.js';

const connection=z.object({tokens:z.object({accessToken:z.string().optional(),refreshToken:z.string().optional()})});
export type DisconnectResult={revoked:boolean;wasConnected:boolean;removed:boolean};
// Local credentials go even when Google cannot be reached, so the caller must report revoked=false.
// The ledger stays without content. Its digests refuse a reused key only within the same connection.
export async function disconnect(dataPath:string,fetcher:typeof fetch=fetch):Promise<DisconnectResult> {
  const databasePath=resolve(dataPath,'google.sqlite'),keyPath=resolve(dataPath,'vault.key');
  if(!existsSync(databasePath)) return {revoked:false,wasConnected:false,removed:true};
  const store=new Store(databasePath);
  try {
    // Hold the write lock first, so a revoked grant is never left with its local copy in place.
    store.db.exec('BEGIN IMMEDIATE');
    const row=store.db.prepare("SELECT 1 FROM secrets WHERE id='local-google'").get();
    let token:string|undefined;
    if(row && existsSync(keyPath)) {
      try {
        const stored=connection.safeParse(new EncryptedVault(store,readFileSync(keyPath)).get('local-google'));
        if(stored.success) token=stored.data.tokens.refreshToken ?? stored.data.tokens.accessToken;
      } catch { /* unreadable: still removed, and reported as not revoked */ }
    }
    let revoked=false;
    if(token) {
      try {
        const response=await fetcher('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token}),signal:AbortSignal.timeout(10_000)});
        revoked=response.ok;
      } catch {revoked=false;}
    }
    store.db.prepare("DELETE FROM secrets WHERE id='local-google' OR id LIKE 'oauth:%'").run();
    store.db.prepare('DELETE FROM cursors').run();
    // Undecided strict-mode proposals are the only place task content can rest.
    store.db.prepare("UPDATE operations SET state='expired',approved_until=NULL,payload='{}' WHERE state='pending'").run();
    store.db.exec('COMMIT');
    rmSync(keyPath,{force:true});
    return {revoked,wasConnected:!!row,removed:true};
  } catch {
    if(store.db.inTransaction) store.db.exec('ROLLBACK');
    return {revoked:false,wasConnected:true,removed:false};
  } finally {store.close();}
}

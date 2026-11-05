import { existsSync,readFileSync,rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { Store,EncryptedVault } from '../storage/index.js';

const connection=z.object({tokens:z.object({accessToken:z.string().optional(),refreshToken:z.string().optional()})});
// Local credentials go even when Google cannot be reached, so the caller must report revoked=false.
// The operation ledger stays: it holds no task content and prevents a key from being reused.
export async function disconnect(dataPath:string,fetcher:typeof fetch=fetch) {
  const databasePath=resolve(dataPath,'google.sqlite'),keyPath=resolve(dataPath,'vault.key');
  if(!existsSync(databasePath)) return {revoked:false,wasConnected:false};
  const store=new Store(databasePath);
  let token:string|undefined,wasConnected=false;
  try {
    if(existsSync(keyPath)) {
      const stored=connection.safeParse(new EncryptedVault(store,readFileSync(keyPath)).get('local-google'));
      if(stored.success) {wasConnected=true;token=stored.data.tokens.refreshToken ?? stored.data.tokens.accessToken;}
    }
  } catch {wasConnected=true;} // An unreadable connection still has to be removed.
  let revoked=false;
  if(token) {
    try {
      const response=await fetcher('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token})});
      revoked=response.ok;
    } catch {revoked=false;}
  }
  store.db.prepare("DELETE FROM secrets WHERE id='local-google' OR id LIKE 'oauth:%'").run();
  store.db.prepare('DELETE FROM cursors').run();
  // Undecided strict-mode proposals are the only place task content can rest.
  store.db.prepare("UPDATE operations SET state='expired',approved_until=NULL,payload='{}' WHERE state='pending'").run();
  store.close();
  rmSync(keyPath,{force:true});
  return {revoked,wasConnected};
}

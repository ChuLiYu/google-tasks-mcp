import { randomBytes,randomUUID } from 'node:crypto';
import { existsSync,readFileSync,writeFileSync,mkdirSync,chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { dataPath } from './runtime.js';
import { Store,EncryptedVault } from '../storage/index.js';
import { GoogleOAuth,GoogleTasks,type Tokens } from '../google/index.js';
import { TaskService,type RealWrites } from '../service/index.js';
import { AppError } from '../domain/index.js';
const clientSchema=z.object({client_id:z.string().min(1),client_secret:z.string().optional()});
const configSchema=z.object({installed:clientSchema.optional(),web:clientSchema.optional()}).refine(c=>c.installed || c.web);
export const GOOGLE_REDIRECT='http://127.0.0.1:8787/callback';
export function googleLocal(createKey=false, writeTest=false) {
  mkdirSync(dataPath,{recursive:true,mode:0o700});
  const configPath=resolve(process.env.GOOGLE_CLIENT_FILE ?? resolve(dataPath,'google-client.json'));
  if(!existsSync(configPath)) throw new Error('請先依 docs/USER_TESTING.md 設定 Google OAuth client JSON。');
  const config=configSchema.parse(JSON.parse(readFileSync(configPath,'utf8'))),client=config.installed ?? config.web!;
  const keyPath=resolve(dataPath,'vault.key');
  if(!existsSync(keyPath)) {
    if(!createKey) throw new Error('尚未完成 Google 連線。');
    writeFileSync(keyPath,randomBytes(32),{mode:0o600,flag:'wx'});
  }
  chmodSync(keyPath,0o600);
  const store=new Store(resolve(dataPath,'google.sqlite'));
  const vault=new EncryptedVault(store,readFileSync(keyPath));
  type Connection={id:string;tokens:Tokens};
  let connection=vault.get<Connection>('local-google');
  const oauth=new GoogleOAuth({clientId:client.client_id,clientSecret:client.client_secret,redirectUri:GOOGLE_REDIRECT,scope:writeTest ? 'https://www.googleapis.com/auth/tasks' : 'https://www.googleapis.com/auth/tasks.readonly'}, {
    get:()=>{connection=vault.get<Connection>('local-google');return connection?.tokens;},
    put:tokens=>{connection={id:connection?.id ?? randomUUID(),tokens};vault.put('local-google',connection);},
  });
  return {store,oauth,connected:()=>!!connection,newConnection:()=>{connection=undefined;store.db.prepare('DELETE FROM cursors').run();},
    service:(realWrites?:RealWrites)=>{
      if(!connection) throw new Error('尚未連接 Google；請先執行 npm run google:connect。');
      const expectedConnection=connection.id;
      return new TaskService(new GoogleTasks(()=>{
        if(vault.get<Connection>('local-google')?.id!==expectedConnection) throw new AppError('GOOGLE_REAUTH_REQUIRED','Google 連線已更換，請重新啟動 MCP client。');
        return oauth.accessToken();
      }),store,{principal:'local-os-owner',connection:expectedConnection},[],10,realWrites);
    },
  };
}

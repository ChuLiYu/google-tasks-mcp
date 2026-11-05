import { randomBytes } from 'node:crypto';
import { readFileSync,lstatSync,openSync,closeSync,unlinkSync,writeSync,writeFileSync,existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { googleLocal } from './local/google-local.js';
import { dataPath } from './local/runtime.js';
import { approvalDesk } from './mcp/approval-desk.js';
import { privateHttp } from './mcp/private-http.js';
import { publicHttp, type GrantStore } from './mcp/public-http.js';

const DESK_PORT=3003,PUBLIC_PORT=3004;
// A retained lock after abnormal exit requires owner inspection, never auto-delete.
const lock=resolve(dataPath,'google-http.lock');
let fd:number|undefined;
let runtime:ReturnType<typeof googleLocal>|undefined;
try {
  const path=resolve(dataPath,'private-http.token'),stat=lstatSync(path);
  if(!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077)!==0) throw new Error('credential');
  const token=readFileSync(path,'utf8').trim();
  if(!/^[a-f0-9]{64}$/.test(token)) throw new Error('credential');
  fd=openSync(lock,'wx',0o600);writeSync(fd,String(process.pid));
  const local=googleLocal();runtime=local;if(!local.connected()) throw new Error('connection');
  // This process holds the lock, so an in_flight row can only be a crashed earlier write.
  local.store.recoverInterrupted();
  local.store.expireProposals();local.store.scrubFinished();
  const writes=process.env.TASKS_REAL_WRITES==='1';
  // Writes need an explicit mode, so a mistyped name or value can never silently mean fewer checks.
  const approvalMode=process.env.TASKS_WRITE_APPROVAL ?? '';
  if(!['direct','local'].includes(approvalMode) && (writes || approvalMode!=='')) throw new Error('approval mode');
  const deskFile=resolve(dataPath,'desk.key');
  if(!existsSync(deskFile)) writeFileSync(deskFile,randomBytes(16).toString('hex'),{mode:0o600,flag:'wx'});
  const deskStat=lstatSync(deskFile);
  if(!deskStat.isFile() || (deskStat.mode & 0o077)!==0) throw new Error('credential');
  const ownerCode=readFileSync(deskFile,'utf8').trim();
  if(!/^[a-f0-9]{32}$/.test(ownerCode)) throw new Error('credential');
  const deskOrigin=`http://127.0.0.1:${DESK_PORT}`;
  // Direct unless the owner opts into per-write approval on the loopback desk (D041).
  const strict=writes && approvalMode==='local';
  const direct=writes && !strict;
  const service=local.service(!writes ? undefined : strict ? {mode:'local-approval',approvalUrl:ref=>`${deskOrigin}/approve/${ref}`} : {mode:'direct'});
  const app=privateHttp(service,token,{readOnly:!writes,localApproval:strict,directWrites:direct});
  const publicFile=resolve(dataPath,'public-url');
  const grants:GrantStore={
    get:id=>{const row=local.store.db.prepare('SELECT value FROM secrets WHERE id=?').get(`oauth:${id}`) as {value:string}|undefined;return row ? JSON.parse(row.value) as unknown : undefined;},
    put:(id,value)=>{local.store.db.prepare('INSERT OR REPLACE INTO secrets VALUES(?,?)').run(`oauth:${id}`,JSON.stringify(value));},
    delete:id=>{local.store.db.prepare('DELETE FROM secrets WHERE id=?').run(`oauth:${id}`);},
    clients:()=>(local.store.db.prepare("SELECT id FROM secrets WHERE id LIKE 'oauth:client:%' ORDER BY rowid").all() as {id:string}[]).map(row=>row.id.slice('oauth:'.length)),
  };
  // Deleting public-url revokes Claude Web: no token survives a restart without the endpoint.
  if(!existsSync(publicFile)) local.store.db.prepare("DELETE FROM secrets WHERE id LIKE 'oauth:access:%' OR id LIKE 'oauth:refresh:%'").run();
  const remote=existsSync(publicFile) ? publicHttp(service,{publicUrl:readFileSync(publicFile,'utf8').trim(),deskOrigin,grants,readOnly:!writes,localApproval:strict,directWrites:direct}) : undefined;
  const desk=approvalDesk(service,DESK_PORT,remote?.consent,ownerCode);
  // Expiry must not depend on a later call: an idle service still clears undecided content.
  setInterval(()=>{if(!stopping) local.store.expireProposals();},3_600_000).unref();
  let stopping=false;
  const cleanup=()=>{if(fd!==undefined) {closeSync(fd);fd=undefined;unlinkSync(lock);}};
  process.on('exit',cleanup);
  const stop=async()=>{
    if(stopping)return;stopping=true;
    desk.server.close();desk.server.closeAllConnections();
    // A listener that failed to bind cannot be closed; storage and the lock must still be released.
    try {await remote?.close();await app.close();} catch {process.exitCode=1;}
    local.store.close();cleanup();
  };
  process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
  for(const listener of [app.server,desk.server,...(remote ? [remote.server] : [])]) listener.on('error',()=>{console.error('Private MCP listener unavailable.');process.exitCode=1;void stop();});
  app.server.listen(3002,'127.0.0.1',()=>console.error(`Private Google Tasks MCP ready on loopback:3002 (${strict ? 'writes need local approval' : direct ? 'direct writes' : 'read-only'}).`));
  desk.server.listen(DESK_PORT,'127.0.0.1');
  remote?.server.listen(PUBLIC_PORT,'127.0.0.1',()=>console.error(`Connector endpoint ready on loopback:${PUBLIC_PORT} for the owner tunnel.`));
} catch {
  runtime?.store.close();
  if(fd!==undefined) {closeSync(fd);unlinkSync(lock);}
  console.error('Private MCP startup refused. Check connection, credential permissions, TASKS_WRITE_APPROVAL, public-url and google-http.lock.');
  process.exitCode=1;
}

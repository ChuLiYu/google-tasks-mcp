import { createServer } from 'node:http';
import { openSync,closeSync,unlinkSync,writeSync,mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { toNodeHandler, localhostHostValidation, localhostOriginValidation } from '@modelcontextprotocol/node';
import { createHandler } from './mcp/index.js';
import { dataPath,demoRuntime } from './local/runtime.js';
import { timezoneHealth } from './domain/index.js';
mkdirSync(dataPath,{recursive:true,mode:0o700});
const lock=resolve(dataPath,'server.lock');
let fd:number;
try { fd=openSync(lock,'wx',0o600);writeSync(fd,String(process.pid)); }
catch {console.error('此資料庫已被另一程序鎖定。若前次異常結束，確認該 PID 已停止後移除 .data/server.lock。');process.exit(1);}
const {store,service}=demoRuntime();store.recoverInterrupted();
const handler=createHandler(service), nodeHandler=toNodeHandler(handler);
const hostGuard=localhostHostValidation(), originGuard=localhostOriginValidation();
const server=createServer((req,res)=>{
  if (!hostGuard(req,res) || !originGuard(req,res)) return;
  if (req.url==='/health' && req.method==='GET') {res.setHeader('Content-Type','application/json');res.end(JSON.stringify({mode:'demo',realGoogleConnected:false,...timezoneHealth()}));return;}
  if (req.url!=='/mcp') {res.writeHead(404);res.end();return;}
  if (Number(req.headers['content-length'] ?? 0)>65536 || req.headers['transfer-encoding']) {res.writeHead(413);res.end();return;}
  void nodeHandler(req,res).catch(()=>{if (!res.headersSent) res.writeHead(500);res.end();});
});
server.requestTimeout=15_000;server.headersTimeout=10_000;server.maxConnections=32;
const port=Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port<1024 || port>65535) throw new Error('PORT must be 1024..65535');
let closing=false,cleaned=false;
const cleanup=()=>{if(cleaned)return;cleaned=true;try{closeSync(fd);unlinkSync(lock);}catch{}};
const stop=async()=>{if(closing)return;closing=true;server.close();await handler.close();store.close();cleanup();process.exit(0);};
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());process.on('exit',cleanup);
server.on('error',()=>{console.error('本機服務無法啟動，請確認連接埠可用。');process.exit(1);});
server.listen(port,'127.0.0.1',()=>console.error(`合成資料 MCP 已啟動：http://127.0.0.1:${port}/mcp\n核准只接受本機終端；尚未連接 Google。\n時區診斷：${JSON.stringify(timezoneHealth())}`));

import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { buildServer } from './mcp/index.js';
import { demoRuntime } from './local/runtime.js';

// Separate from Google: this entry only creates synthetic data in demo.sqlite.
const runtime=demoRuntime();
runtime.store.recoverInterrupted();
console.error('合成資料 MCP 核准原型；不連線 Google。需支援表單確認的 MCP 客戶端。');
const handle=serveStdio(({era})=>buildServer(runtime.service,{demoElicitation:true,demoRoundTrip:era==='modern'}));
const stop=async()=>{await handle.close();runtime.store.close();};
process.on('SIGINT',()=>void stop());
process.on('SIGTERM',()=>void stop());

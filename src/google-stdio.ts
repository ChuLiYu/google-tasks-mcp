import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { buildServer } from './mcp/index.js';
import { googleLocal } from './local/google-local.js';
let runtime:ReturnType<typeof googleLocal>;
try {runtime=googleLocal();if(!runtime.connected()) throw new Error('not connected');}
catch {console.error('Google 尚未連線或本機設定無效，請依 docs/USER_TESTING.md 執行 google:connect。');process.exit(1);}
console.error('Google 唯讀 MCP（本機 stdio，真實寫入關閉）。');
const handle=serveStdio(()=>buildServer(runtime.service(),{readOnly:true}));
const stop=async()=>{await handle.close();runtime.store.close();};
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());

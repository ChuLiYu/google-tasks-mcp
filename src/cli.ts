import { createInterface } from 'node:readline/promises';
import { stdin,stdout } from 'node:process';
import { scopeKey,hash,safeError,schemas,type ToolName } from './domain/index.js';
import { demoRuntime } from './local/runtime.js';
import { type Operation } from './storage/index.js';
const {store,adapter,service}=demoRuntime();
async function approve(ref:string) {
  const op=store.db.prepare("SELECT * FROM operations WHERE ref=? AND scope=? AND state='pending'").get(ref,scopeKey({principal:'local-demo-owner',connection:'synthetic-v1'})) as unknown as Operation|undefined;
  if(!op) throw new Error('找不到待核准提案。');
  const payload=JSON.parse(op.payload) as {taskListId:string;taskId?:string};
  let before:unknown;
  if(payload.taskId) {
    before=await adapter.get(payload.taskListId,payload.taskId);
    const row=store.db.prepare('SELECT value FROM secrets WHERE id=?').get(`snapshot:${op.ref}`) as {value:string}|undefined;
    if(!row || (JSON.parse(row.value) as {digest:string}).digest!==hash(before)) throw new Error('任務已改變；請重新提案。');
  }
  stdout.write(`\n僅修改本機合成資料（不會呼叫 Google）\n操作：${op.tool}\n${JSON.stringify(payload,null,2)}\n${before ? `修改前：${JSON.stringify(before,null,2)}\n` : ''}`);
  if(!stdin.isTTY) throw new Error('核准必須由互動終端執行，不接受管線或模型參數。');
  const rl=createInterface({input:stdin,output:stdout});
  try {if(await rl.question('確認以上內容？請輸入 APPROVE：')!=='APPROVE') {stdout.write('已取消。\n');return;}store.approve(ref);stdout.write('已核准，有效 5 分鐘。請以原 key 與原內容重試。\n');}finally{rl.close();}
}
try {
  const [command,...args]=process.argv.slice(2);
  if(command==='approve') await approve(args[0] ?? '');
  else if(command==='pending') {
    const rows=store.db.prepare("SELECT ref,tool,payload,created FROM operations WHERE scope=? AND state='pending' ORDER BY created DESC LIMIT 20").all(scopeKey({principal:'local-demo-owner',connection:'synthetic-v1'}));
    stdout.write(`${JSON.stringify(rows,null,2)}\n`);
  } else if(command && command in schemas) stdout.write(`${JSON.stringify(await service.call(command as ToolName,JSON.parse(args.join(' ') || '{}')),null,2)}\n`);
  else stdout.write('用法：npm run demo -- list_task_lists\n      npm run demo -- search_tasks \'{"taskListId":"demo-inbox","query":"第三頁"}\'\n      npm run demo -- create_task \'{"taskListId":"demo-inbox","title":"我的測試","taskDate":"2026-11-02","idempotencyKey":"my-test-1"}\'\n      npm run demo -- pending\n      npm run demo -- approve <operationRef>\n工具可直接於 CLI 測試；或 npm start 後用 MCP Inspector 連線。\n');
} catch(e) {stdout.write(`${JSON.stringify(safeError(e),null,2)}\n`);process.exitCode=1;} finally{store.close();}

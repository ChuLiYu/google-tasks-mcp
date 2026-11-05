// Protocol-only smoke: no tool calls, no reads of Google Tasks or token refresh.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
const client=new Client({name:'private-stdio-smoke',version:'1.0'});
const transport=new StdioClientTransport({
  command:'/bin/sh',args:[fileURLToPath(new URL('../containers/google-stdio.sh',import.meta.url))],stderr:'pipe',
});
// Do not emit runtime diagnostics or accidentally expose a sensitive upstream error.
transport.stderr?.on('data',()=>{});
const timeout=setTimeout(()=>{void client.close();process.exitCode=1;},20_000);
try {
  await client.connect(transport);
  const {tools}=await client.listTools();
  assert.deepEqual(tools.map(t=>t.name).sort(),['get_task','list_task_lists','list_tasks','search_tasks']);
  assert.ok(tools.every(t=>t.annotations?.readOnlyHint===true));
  console.log(JSON.stringify({mode:'google-stdio-protocol-only',protocol:client.getNegotiatedProtocolVersion(),toolCount:tools.length,readOnly:true,googleDataRequested:false}));
}catch{console.error('stdio 協定驗證失敗；請檢查 OrbStack、已建置 image、本機 Google 連線及是否已有同名容器。');process.exitCode=1;}
finally{clearTimeout(timeout);await client.close();}

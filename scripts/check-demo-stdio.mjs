import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

const modern=process.argv.length===3 && process.argv[2]==='--modern';
if(process.argv.length!==2 && !modern) throw new Error('Only --modern is accepted.');
const root=fileURLToPath(new URL('../',import.meta.url));
const data=await mkdtemp(join(tmpdir(),'tasks-demo-stdio-'));
const client=new Client({name:'synthetic-approval-smoke',version:'1.0'},{capabilities:{elicitation:{form:{}}},...(modern ? {versionNegotiation:{mode:{pin:'2026-07-28'}}} : {})});
let decision='decline',prompts=0;
client.setRequestHandler('elicitation/create',async request=>{
  assert.equal(request.params.mode,'form');
  assert.match(request.params.message,/本機合成資料/);
  prompts++;
  return decision==='accept' ? {action:'accept',content:{approved:true}} : {action:'decline'};
});
const container=process.env.TASKS_DEMO_SMOKE_CONTAINER==='1';
const transport=new StdioClientTransport(container ? {command:'/bin/sh',args:[join(root,'containers/demo-stdio.sh')],cwd:root,stderr:'ignore'} : {command:process.execPath,args:[join(root,'dist/demo-stdio.js')],cwd:root,env:{TASKS_DATA_DIR:data},stderr:'ignore'});
const runKey=randomUUID();
const timer=setTimeout(()=>{void client.close();},20_000);
const request=async(name,args)=>{
  let result=await client.callTool({name,arguments:args},modern ? {allowInputRequired:true} : undefined);
  if(modern && result.resultType==='input_required') {
    assert.equal(typeof result.requestState,'string');
    assert.equal(result.inputRequests?.approval?.method,'elicitation/create');
    assert.match(result.inputRequests.approval.params.message,/本機合成資料/);
    prompts++;
    result=await client.callTool({name,arguments:args,requestState:result.requestState,
      inputResponses:{approval:decision==='accept' ? {action:'accept',content:{approved:true}} : {action:'decline'}}});
  }
  return result;
};
const call=async(name,args)=>{
  const result=await request(name,args);
  assert.equal(result.isError,undefined);
  assert.ok(result.structuredContent);
  return result.structuredContent;
};
try {
  await client.connect(transport);
  assert.equal((await client.listTools()).tools.length,7);
  const args={taskListId:'demo-inbox',title:'Synthetic approval smoke',idempotencyKey:`stdio-create-${runKey}`};
  const decline=await request('create_task',args);
  assert.equal(decline.structuredContent?.code,'APPROVAL_CANCELLED');
  decision='accept';
  const created=await call('create_task',args);
  assert.equal(created.mode,'demo');assert.equal(typeof created.task?.id,'string');
  const replay=await call('create_task',args);
  assert.equal(replay.task.id,created.task.id);assert.equal(prompts,2);
  const ids={taskListId:'demo-inbox',taskId:created.task.id};
  const updated=await call('update_task',{...ids,expectedEtag:created.task.etag,changes:{notes:'Synthetic revised notes'},operationKey:`stdio-update-${runKey}`});
  assert.equal(updated.task.notes,'Synthetic revised notes');
  const complete=await call('complete_task',{...ids,expectedEtag:updated.task.etag,operationKey:`stdio-complete-${runKey}`});
  assert.equal(complete.task.status,'completed');
  const read=await call('get_task',ids);assert.equal(read.task.status,'completed');
  assert.equal(prompts,4);
  const search=await call('search_tasks',{taskListId:'demo-inbox',query:'第三頁'});
  assert.equal(search.scannedPages,3);assert.equal(search.complete,true);
  console.log(JSON.stringify({syntheticOnly:true,protocol:modern?'2026-07-28':'legacy',container,stdioApproval:true,declineBlocked:true,createUpdateCompleteRead:true,replayWithoutReprompt:true,threePageSearch:true,humanApprovalTested:false,googleTested:false,chatgptTested:false}));
} finally {
  clearTimeout(timer);await client.close();await rm(data,{recursive:true,force:true});
}

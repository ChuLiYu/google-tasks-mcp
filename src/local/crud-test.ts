import { z } from 'zod';
import { AppError,requireTaskVersion,type Context } from '../domain/index.js';
import { GoogleTasks,GoogleHttpError } from '../google/index.js';
import { Store } from '../storage/index.js';
import { TaskService } from '../service/index.js';

const base='https://tasks.googleapis.com/tasks/v1/';
const identified=z.object({id:z.string().min(1)});
const reportSchema=z.object({create:z.literal(true),read:z.literal(true),search:z.literal(true),update:z.literal(true),complete:z.literal(true),delete:z.literal(true),cleanup:z.literal(true)});
const conditionalReportSchema=reportSchema.extend({staleVersionRefused:z.literal(true),staleWritePreserved:z.literal(true)});
function verify(ok:unknown):asserts ok {if(!ok) throw new AppError('TEST_ASSERTION_FAILED','Google 測試結果不符合預期；停止後續寫入。');}

// Local maintenance harness for an explicitly human-authorized synthetic test batch.
// Never registered as an MCP tool; does not approve any production operation.
async function runAuthorizedTest(store:Store,ctx:Context,token:()=>Promise<string>,runKey:string,fetcher:typeof fetch,conditional:boolean) {
  const request=async(path:string,method='GET',body?:unknown):Promise<unknown>=>{
    const access=await token();
    const response=await fetcher(base+path,{method,headers:{Authorization:`Bearer ${access}`,...(body ? {'Content-Type':'application/json'} : {})},...(body ? {body:JSON.stringify(body)} : {}),signal:AbortSignal.timeout(10_000),redirect:'error'});
    if(!response.ok) {void response.body?.cancel().catch(()=>{});throw new GoogleHttpError(response.status);}
    if(method==='DELETE') {await response.text();return {deleted:true};}
    return response.json();
  };
  const tool=conditional?'authorized_conditional_test':'authorized_crud_test';
  const schema=conditional?conditionalReportSchema:reportSchema;
  const run=store.proposal(ctx,tool,runKey,{version:1});
  if(run.state==='succeeded') return schema.parse(JSON.parse(run.result!));
  // A durable pending -> in_flight compare-and-swap reserves this authorized batch.
  // An interrupted/failed batch is never automatically resumed or repeated.
  const reserve=(ref:string)=>verify(store.db.prepare("UPDATE operations SET state='in_flight' WHERE ref=? AND state='pending'").run(ref).changes===1);
  if(run.state!=='pending') throw new AppError('WRITE_OUTCOME_UNKNOWN','此測試已開始或結果不明，禁止重送。');
  reserve(run.ref);
  const mutate=async<T>(step:string,payload:unknown,action:()=>Promise<T>):Promise<T>=>{
    const op=store.proposal(ctx,conditional?'authorized_conditional_step':'authorized_crud_step',`${runKey}:${step}`,payload);
    reserve(op.ref);
    try {const result=await action();store.finish(op.ref,'succeeded',result);return result;}
    catch(error) {try{store.finish(op.ref,'uncertain');}catch{/* in_flight also blocks replay */}throw error;}
  };
  try {
    const access=await token();
    const scopeResponse=await fetcher('https://oauth2.googleapis.com/tokeninfo?'+new URLSearchParams({access_token:access}),{signal:AbortSignal.timeout(10_000),redirect:'error'});
    verify(scopeResponse.ok);
    const grant=z.object({scope:z.string()}).parse(await scopeResponse.json());
    if(!grant.scope.split(' ').includes('https://www.googleapis.com/auth/tasks')) throw new AppError('ACCESS_DENIED','測試需要 Tasks 讀寫授權。');
    const list=await mutate('create-list',{title:'MCP 專用 CRUD 合成測試'},async()=>identified.parse(await request('users/@me/lists','POST',{title:'MCP 專用 CRUD 合成測試'})));
    const listPath=`users/@me/lists/${encodeURIComponent(list.id)}`;
    verify(identified.parse(await request(listPath)).id===list.id);
    const adapter=new GoogleTasks(token,fetcher);
    const service=new TaskService(adapter,store,ctx);
    const original={title:'MCP 合成任務',notes:'僅供 CRUD 測試',taskDate:'2026-11-02'};
    const task=await mutate('create-task',{listId:list.id,...original},()=>adapter.create(list.id,original));
    const got=await adapter.get(list.id,task.id);
    verify(got.id===task.id && got.title===original.title && got.notes===original.notes && got.taskDate===original.taskDate && !got.assignmentInfo);
    const search=await service.call('search_tasks',{taskListId:list.id,query:original.title});
    const matches=z.array(identified).parse(search.items);
    verify(search.complete===true && matches.length===1 && matches[0]?.id===task.id);
    const changes={title:'MCP 合成任務已更新',notes:'更新驗證',taskDate:'2028-02-29'};
    const updateVersion=requireTaskVersion(got.etag);
    await mutate('update-task',{listId:list.id,taskId:task.id,...changes,expectedVersion:updateVersion},()=>adapter.patch(list.id,task.id,changes,updateVersion));
    const updated=await adapter.get(list.id,task.id);
    verify(updated.id===task.id && updated.title===changes.title && updated.notes===changes.notes && updated.taskDate===changes.taskDate && !updated.assignmentInfo);
    if(conditional) {
      const currentVersion=requireTaskVersion(updated.etag);
      verify(currentVersion!==updateVersion);
      // Expected refusal is itself durably reserved: a lost response must never
      // cause this deliberately stale write to be submitted a second time.
      await mutate('reject-stale-update',{listId:list.id,taskId:task.id,expectedVersion:updateVersion,title:'MCP stale write must not persist'},async()=>{
        let refused=false;
        try {await adapter.patch(list.id,task.id,{title:'MCP stale write must not persist'},updateVersion);}
        catch(error) {if(error instanceof GoogleHttpError && error.status===412) refused=true;else throw error;}
        verify(refused);
        const preserved=await adapter.get(list.id,task.id);
        verify(JSON.stringify(preserved)===JSON.stringify(updated));
        return {staleVersionRefused:true,staleWritePreserved:true};
      });
    }
    const completeVersion=requireTaskVersion(updated.etag);
    await mutate('complete-task',{listId:list.id,taskId:task.id,expectedVersion:completeVersion},()=>adapter.patch(list.id,task.id,{status:'completed'},completeVersion));
    const completed=await adapter.get(list.id,task.id);
    verify(completed.status==='completed' && completed.taskDate===changes.taskDate && !completed.assignmentInfo);
    const pageSchema=z.object({items:z.array(z.object({id:z.string(),assignmentInfo:z.unknown().optional()})).default([]),nextPageToken:z.string().optional()});
    const taskPath=`lists/${encodeURIComponent(list.id)}/tasks`;
    const listTasks=async()=>pageSchema.parse(await request(`${taskPath}?maxResults=100&showCompleted=true&showHidden=true&showDeleted=false&showAssigned=true`));
    const beforeDelete=await listTasks();
    verify(!beforeDelete.nextPageToken && beforeDelete.items.length===1 && beforeDelete.items[0]?.id===task.id && !beforeDelete.items[0]?.assignmentInfo);
    await mutate('delete-task',{listId:list.id,taskId:task.id},()=>request(`${taskPath}/${encodeURIComponent(task.id)}`,'DELETE'));
    const empty=await listTasks();verify(!empty.nextPageToken && empty.items.length===0);
    await mutate('delete-list',{listId:list.id},()=>request(listPath,'DELETE'));
    let absent=false;
    try{await request(listPath);}catch(error){if(error instanceof GoogleHttpError && [404,410].includes(error.status))absent=true;else throw error;}
    verify(absent);
    const report=schema.parse({create:true,read:true,search:true,update:true,complete:true,delete:true,cleanup:true,...(conditional?{staleVersionRefused:true,staleWritePreserved:true}:{})});
    store.finish(run.ref,'succeeded',report);return report;
  }catch(error){try{store.finish(run.ref,'uncertain');}catch{/* durable reservation still blocks replay */}throw error;}
}

export function authorizedCrudTest(store:Store,ctx:Context,token:()=>Promise<string>,runKey:string,fetcher:typeof fetch=fetch) {
  return runAuthorizedTest(store,ctx,token,runKey,fetcher,false);
}

// Separate authorization scope and journal namespace; the historical CRUD grant
// does not authorize running this additional deliberately stale PATCH.
export function authorizedConditionalUpdateTest(store:Store,ctx:Context,token:()=>Promise<string>,runKey:string,fetcher:typeof fetch=fetch) {
  return runAuthorizedTest(store,ctx,token,runKey,fetcher,true);
}

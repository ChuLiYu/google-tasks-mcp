import { it,expect } from 'vitest';
import { http,HttpResponse } from 'msw';
import { mock } from './setup.js';
import { Store } from '../src/storage/index.js';
import { authorizedCrudTest,authorizedConditionalUpdateTest } from '../src/local/crud-test.js';

const base='https://tasks.googleapis.com/tasks/v1';
const ctx={principal:'synthetic',connection:'A'};
function fixture(options:{readonly?:boolean;timeout?:boolean;foreignTask?:boolean;ignoreIfMatch?:boolean;staleTimeout?:boolean;corruptAfterRefusal?:boolean;missingVersion?:boolean;unchangedVersion?:boolean}={}) {
  let writes=0;
  let staleRequests=0;
  const lists=new Set<string>(),tasks=new Map<string,Record<string,unknown>>();
  const account=(request:Request)=>request.headers.get('authorization')!;
  mock.use(
    http.get('https://oauth2.googleapis.com/tokeninfo',()=>HttpResponse.json({scope:`https://www.googleapis.com/auth/tasks${options.readonly?'.readonly':''}`})),
    http.post(`${base}/users/@me/lists`,({request})=>{writes++;if(options.timeout)return HttpResponse.error();const id=account(request);lists.add(id);return HttpResponse.json({id});}),
    http.get(`${base}/users/@me/lists/:id`,({params})=>lists.has(String(params.id))?HttpResponse.json({id:params.id}):new HttpResponse(null,{status:404})),
    http.delete(`${base}/users/@me/lists/:id`,({params})=>{writes++;lists.delete(String(params.id));return new HttpResponse(null,{status:204});}),
    http.post(`${base}/lists/:list/tasks`,async({request,params})=>{writes++;const value={...await request.json() as object,id:'task',status:'needsAction',...(options.missingVersion?{}:{etag:'v1'})};tasks.set(String(params.list),value);return HttpResponse.json(value);}),
    http.get(`${base}/lists/:list/tasks/:id`,({params})=>HttpResponse.json(tasks.get(String(params.list)))),
    http.patch(`${base}/lists/:list/tasks/:id`,async({params,request})=>{
      writes++;
      const previous=tasks.get(String(params.list));
      if(request.headers.get('if-match')!==previous?.etag) {
        staleRequests++;
        if(options.staleTimeout)return HttpResponse.error();
        if(options.corruptAfterRefusal)tasks.set(String(params.list),{...previous,notes:'unexpected mutation'});
        if(!options.ignoreIfMatch)return new HttpResponse(null,{status:412});
      }
      const value={...previous,...await request.json() as object,etag:options.unchangedVersion?previous?.etag:String(previous?.etag)+'next'};
      tasks.set(String(params.list),value);return HttpResponse.json(value);
    }),
    http.delete(`${base}/lists/:list/tasks/:id`,({params})=>{writes++;tasks.delete(String(params.list));return new HttpResponse(null,{status:204});}),
    http.get(`${base}/lists/:list/tasks`,({params,request})=>{
      const task=tasks.get(String(params.list));
      const extra=options.foreignTask && new URL(request.url).searchParams.get('showAssigned')==='true';
      return HttpResponse.json({items:[...(task?[task]:[]),...(extra?[{id:'foreign'}]:[])]});
    }),
  );
  return {writes:()=>writes,staleRequests:()=>staleRequests,lists};
}

it('verifies real adapter CRUD contracts and cleanup, then replays without writes',async()=>{
  const f=fixture(),store=new Store(':memory:');
  try{
    const result=await authorizedCrudTest(store,ctx,async()=>'A','fixed');
    expect(result).toEqual({create:true,read:true,search:true,update:true,complete:true,delete:true,cleanup:true});
    expect(f.writes()).toBe(6);expect(f.lists.size).toBe(0);
    await expect(authorizedCrudTest(store,ctx,async()=>'A','fixed')).resolves.toEqual(result);
    expect(f.writes()).toBe(6);
  }finally{store.close();}
});
it('refuses readonly grants before any mutation',async()=>{
  const f=fixture({readonly:true}),store=new Store(':memory:');
  try{await expect(authorizedCrudTest(store,ctx,async()=>'A','fixed')).rejects.toMatchObject({code:'ACCESS_DENIED'});expect(f.writes()).toBe(0);}finally{store.close();}
});
it('20 concurrent runs reserve one batch and issue one create-list POST',async()=>{
  const f=fixture(),store=new Store(':memory:');
  try{
    const results=await Promise.allSettled(Array.from({length:20},()=>authorizedCrudTest(store,ctx,async()=>'A','fixed')));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(f.writes()).toBe(6);
  }finally{store.close();}
});
it('network outcome unknown remains blocked after interruption recovery',async()=>{
  const f=fixture({timeout:true}),store=new Store(':memory:');
  try{
    await expect(authorizedCrudTest(store,ctx,async()=>'A','fixed')).rejects.toThrow();
    store.recoverInterrupted();
    await expect(authorizedCrudTest(store,ctx,async()=>'A','fixed')).rejects.toMatchObject({code:'WRITE_OUTCOME_UNKNOWN'});
    expect(f.writes()).toBe(1);
  }finally{store.close();}
});
it('same run key on different connections uses isolated journals and tokens',async()=>{
  const f=fixture(),store=new Store(':memory:');
  try{
    await Promise.all(['A','B'].map(connection=>authorizedCrudTest(store,{...ctx,connection},async()=>connection,'fixed')));
    expect(f.writes()).toBe(12);
    const rows=store.db.prepare("SELECT DISTINCT scope FROM operations WHERE tool='authorized_crud_test'").all();
    expect(rows).toHaveLength(2);
  }finally{store.close();}
});
it('an unexpected task stops all cleanup rather than deleting outside this batch',async()=>{
  const f=fixture({foreignTask:true}),store=new Store(':memory:');
  try{
    await expect(authorizedCrudTest(store,ctx,async()=>'A','fixed')).rejects.toMatchObject({code:'TEST_ASSERTION_FAILED'});
    expect(f.writes()).toBe(4);expect(f.lists.size).toBe(1);
  }finally{store.close();}
});

it('conditional batch requires a real stale-version refusal and preserved read-back, then replays without requests',async()=>{
  const f=fixture(),store=new Store(':memory:');
  try{
    const result=await authorizedConditionalUpdateTest(store,ctx,async()=>'A','conditional');
    expect(result).toMatchObject({staleVersionRefused:true,staleWritePreserved:true,cleanup:true});
    expect(f.staleRequests()).toBe(1);expect(f.writes()).toBe(7);expect(f.lists.size).toBe(0);
    await expect(authorizedConditionalUpdateTest(store,ctx,async()=>{throw new Error('Replay must not fetch token');},'conditional')).resolves.toEqual(result);
    expect(f.writes()).toBe(7);
  }finally{store.close();}
});
it.each([{ignoreIfMatch:true},{corruptAfterRefusal:true}])('stops without cleanup if conditional update semantics are unsafe: %j',async options=>{
  const f=fixture(options),store=new Store(':memory:');
  try{
    await expect(authorizedConditionalUpdateTest(store,ctx,async()=>'A','conditional')).rejects.toMatchObject({code:'TEST_ASSERTION_FAILED'});
    expect(f.writes()).toBe(4);expect(f.staleRequests()).toBe(1);expect(f.lists.size).toBe(1);
    await expect(authorizedConditionalUpdateTest(store,ctx,async()=>'A','conditional')).rejects.toMatchObject({code:'WRITE_OUTCOME_UNKNOWN'});
    expect(f.writes()).toBe(4);
  }finally{store.close();}
});
it('never resubmits an outcome-unknown stale probe, including after recovery',async()=>{
  const f=fixture({staleTimeout:true}),store=new Store(':memory:');
  try{
    await expect(authorizedConditionalUpdateTest(store,ctx,async()=>'A','conditional')).rejects.toMatchObject({code:'WRITE_OUTCOME_UNKNOWN'});
    store.recoverInterrupted();
    await expect(authorizedConditionalUpdateTest(store,ctx,async()=>'A','conditional')).rejects.toMatchObject({code:'WRITE_OUTCOME_UNKNOWN'});
    expect(f.writes()).toBe(4);expect(f.staleRequests()).toBe(1);expect(f.lists.size).toBe(1);
  }finally{store.close();}
});
it('refuses the conditional batch with readonly scope or a missing version',async()=>{
  for(const options of [{readonly:true},{missingVersion:true}]) {
    const f=fixture(options),store=new Store(':memory:');
    try{
      await expect(authorizedConditionalUpdateTest(store,ctx,async()=>'A','conditional')).rejects.toThrow();
      expect(f.writes()).toBe(options.readonly?0:2);expect(f.staleRequests()).toBe(0);
    }finally{store.close();}
  }
});
it('reserves one conditional batch among 20 concurrent requests',async()=>{
  const f=fixture(),store=new Store(':memory:');
  try{
    const results=await Promise.allSettled(Array.from({length:20},()=>authorizedConditionalUpdateTest(store,ctx,async()=>'A','conditional')));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(f.writes()).toBe(7);expect(f.staleRequests()).toBe(1);
  }finally{store.close();}
});
it('does not claim stale-version evidence when the valid update has no new ETag',async()=>{
  const f=fixture({unchangedVersion:true}),store=new Store(':memory:');
  try{
    await expect(authorizedConditionalUpdateTest(store,ctx,async()=>'A','conditional')).rejects.toMatchObject({code:'TEST_ASSERTION_FAILED'});
    expect(f.writes()).toBe(3);expect(f.staleRequests()).toBe(0);expect(f.lists.size).toBe(1);
  }finally{store.close();}
});
it('conditional cleanup also refuses unexpected task data',async()=>{
  const f=fixture({foreignTask:true}),store=new Store(':memory:');
  try{
    await expect(authorizedConditionalUpdateTest(store,ctx,async()=>'A','conditional')).rejects.toMatchObject({code:'TEST_ASSERTION_FAILED'});
    expect(f.writes()).toBe(5);expect(f.staleRequests()).toBe(1);expect(f.lists.size).toBe(1);
  }finally{store.close();}
});
it('isolates conditional batches by account and from historical CRUD journals',async()=>{
  const f=fixture(),store=new Store(':memory:');
  try{
    await authorizedCrudTest(store,ctx,async()=>'A','same-key');
    await Promise.all(['A','B'].map(connection=>authorizedConditionalUpdateTest(store,{...ctx,connection},async()=>connection,'same-key')));
    expect(f.writes()).toBe(20);expect(f.staleRequests()).toBe(2);
    expect(store.db.prepare("SELECT DISTINCT scope FROM operations WHERE tool='authorized_conditional_test'").all()).toHaveLength(2);
  }finally{store.close();}
});

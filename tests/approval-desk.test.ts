import { request } from 'node:http';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { Store } from '../src/storage/index.js';
import { DemoTasks,DEMO_LIST } from '../src/demo/index.js';
import { TaskService } from '../src/service/index.js';
import { approvalDesk } from '../src/mcp/approval-desk.js';
import { AppError,type Context } from '../src/domain/index.js';

const OWNER_CODE='0123456789abcdef0123456789abcdef';
const ctx:Context={principal:'owner',connection:'connection-A'};
const create={taskListId:DEMO_LIST,title:'Practice exam',taskDate:'2026-12-01',idempotencyKey:'k1'};
let store:Store,adapter:DemoTasks,service:TaskService,desk:ReturnType<typeof approvalDesk>,port:number;
const realService=(context:Context)=>new TaskService(adapter,store,context,[],10,{mode:'local-approval',approvalUrl:ref=>`http://127.0.0.1:${port}/approve/${ref}`});
type Reply={status:number;body:string;headers:Record<string,unknown>};
function call(method:string,path:string,options:{headers?:Record<string,string>;body?:string}={}):Promise<Reply> {
  return new Promise((resolve,reject)=>{
    const req=request({host:'127.0.0.1',port,method,path,headers:options.headers},res=>{
      let body='';res.setEncoding('utf8');res.on('data',(c:string)=>{body+=c;});res.on('end',()=>{resolve({status:res.statusCode ?? 0,body,headers:res.headers});});
    });
    req.on('error',reject);req.end(method==='POST' && options.body && !options.body.includes('owner_code') ? `${options.body}&owner_code=${OWNER_CODE}` : options.body);
  });
}
const browser=()=>({Origin:`http://127.0.0.1:${port}`,'Sec-Fetch-Site':'same-origin','Content-Type':'application/x-www-form-urlencoded'});
const hidden=(html:string,name:string)=>new RegExp(`name="${name}" value="([^"]*)"`).exec(html)?.[1] ?? '';
async function propose(input:unknown=create,tool:'create_task'|'update_task'|'complete_task'='create_task') {
  try {await service.call(tool,input);}
  catch(error) {
    expect(error).toMatchObject({code:'APPROVAL_REQUIRED'});
    const details=(error as AppError).details as {operationRef:string;approvalUrl:string};
    expect(details.approvalUrl).toBe(`http://127.0.0.1:${port}/approve/${details.operationRef}`);
    return details.operationRef;
  }
  throw new Error('Expected approval requirement');
}
async function decide(ref:string,decision:string,headers=browser()) {
  const page=await call('GET',`/approve/${ref}`);
  const body=new URLSearchParams({csrf:hidden(page.body,'csrf'),digest:hidden(page.body,'digest'),decision}).toString();
  return call('POST',`/approve/${ref}`,{headers,body});
}
beforeEach(async()=>{
  store=new Store(':memory:');adapter=new DemoTasks(store);
  Object.defineProperty(adapter,'mode',{value:'google'});
  desk=approvalDesk(new TaskService(adapter,store,ctx,[],10,{mode:'local-approval',approvalUrl:()=>''}),0,undefined,OWNER_CODE);
  await new Promise<void>(resolve=>desk.server.listen(0,'127.0.0.1',resolve));
  const address=desk.server.address();
  if(!address || typeof address==='string') throw new Error('No TCP listener');
  port=address.port;
  // Host/Origin checks use the configured port, so rebuild once the ephemeral port is known.
  await new Promise<void>(resolve=>desk.server.close(()=>{resolve();}));
  service=realService(ctx);
  desk=approvalDesk(service,port,undefined,OWNER_CODE);
  await new Promise<void>(resolve=>desk.server.listen(port,'127.0.0.1',resolve));
});
afterEach(async()=>{
  await new Promise<void>(resolve=>{desk.server.close(()=>{resolve();});desk.server.closeAllConnections();});
  store.close();
});
describe('local approval desk for real writes',()=>{
  it('a forged Origin without the owner code cannot decide, and nothing is written',async()=>{
    const ref=await propose();
    const form=(await call('GET',`/approve/${ref}`)).body;
    const body=`csrf=${encodeURIComponent(hidden(form,'csrf'))}&digest=${encodeURIComponent(hidden(form,'digest'))}&decision=approve`;
    for(const code of ['','wrong']) {
      const denied=await call('POST',`/approve/${ref}`,{headers:browser(),body:`${body}&owner_code=${code}`});
      expect(denied.status).toBe(403);
    }
    await expect(service.call('create_task',create)).rejects.toMatchObject({code:'APPROVAL_REQUIRED'});
  });
  it('the right code unlocks this browser by HttpOnly cookie, and the cookie is what later requests need',async()=>{
    const ref=await propose();
    const first=await call('GET',`/approve/${ref}`);
    expect(first.body).toContain('owner_code');
    const body=`csrf=${encodeURIComponent(hidden(first.body,'csrf'))}&digest=${encodeURIComponent(hidden(first.body,'digest'))}&decision=reject&owner_code=${OWNER_CODE}`;
    const done=await call('POST',`/approve/${ref}`,{headers:browser(),body});
    expect(done.status).toBe(200);
    const cookie=String((done.headers['set-cookie'] as string[])[0]);
    expect(cookie).toMatch(/HttpOnly; SameSite=Strict/);
    const next=await propose({...create,idempotencyKey:'k-next'});
    expect((await call('GET',`/approve/${next}`,{headers:{Cookie:cookie.split(';')[0] ?? ''}})).body).not.toContain('owner_code');
    vi.useFakeTimers({now:Date.now()+9*3600_000,toFake:['Date']});
    try {expect((await call('GET',`/approve/${next}`,{headers:{Cookie:cookie.split(';')[0] ?? ''}})).body).toContain('owner_code');}
    finally {vi.useRealTimers();}
  });
  it('the first call proposes only; upstream is untouched and the page shows server-read content',async()=>{
    const upstream=vi.spyOn(adapter,'create');
    const ref=await propose();
    expect(upstream).not.toHaveBeenCalled();
    const page=await call('GET',`/approve/${ref}`);
    expect(page.status).toBe(200);
    expect(page.body).toContain('Practice exam');expect(page.body).toContain('2026-12-01');
    expect(page.headers['content-security-policy']).toContain("default-src 'none'");
    expect(page.headers['x-frame-options']).toBe('DENY');
    // Observed in a real browser: no-referrer turns the form's Origin into "null" and blocks every decision.
    expect(page.headers['referrer-policy']).toBe('same-origin');
  });
  it('approving once lets one retry write once, and replay returns the stored result',async()=>{
    const upstream=vi.spyOn(adapter,'create');
    const ref=await propose();
    expect((await decide(ref,'approve')).status).toBe(200);
    const first=await service.call('create_task',create);
    const replay=await service.call('create_task',create);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(first).toMatchObject({mode:'google',operationRef:ref,task:{title:'Practice exam',taskDate:'2026-12-01'}});
    expect(replay).toMatchObject({mode:'google',operationRef:ref,replayed:true,task:{id:(first.task as {id:string}).id,title:'Practice exam'}});
  });
  const dump=()=>JSON.stringify([store.db.prepare('SELECT * FROM operations').all(),store.db.prepare('SELECT * FROM secrets').all(),store.db.prepare('SELECT * FROM cursors').all()]);
  it('D040: no task content stays in the ledger once a write is done',async()=>{
    const ref=await propose();
    expect(dump()).toContain('Practice exam'); // Needed only while waiting for the owner's decision.
    expect((await decide(ref,'approve')).status).toBe(200);
    await service.call('create_task',create);
    expect(dump()).not.toContain('Practice exam');expect(dump()).not.toContain('2026-12-01');
  });
  it('D040: an update leaves neither its old nor its new content locally',async()=>{
    const before=await adapter.get(DEMO_LIST,'demo-1');
    const args={taskListId:DEMO_LIST,taskId:before.id,expectedEtag:before.etag ?? '',changes:{title:'新標題內容'},operationKey:'u2'};
    const ref=await propose(args,'update_task');
    expect((await decide(ref,'approve')).status).toBe(200);
    await service.call('update_task',args);
    const ledger=JSON.stringify(store.db.prepare('SELECT * FROM operations').all());
    expect(ledger).not.toContain('新標題內容');expect(ledger).not.toContain(before.title);
  });
  it('D040: replay shows the task as Google has it now, with no second write',async()=>{
    const upstream=vi.spyOn(adapter,'create');
    const ref=await propose();
    expect((await decide(ref,'approve')).status).toBe(200);
    const first=await service.call('create_task',create),task=first.task as {id:string;etag:string};
    await adapter.patch(DEMO_LIST,task.id,{title:'在 Google 改過'},task.etag);
    expect(await service.call('create_task',create)).toMatchObject({replayed:true,task:{title:'在 Google 改過'}});
    expect(upstream).toHaveBeenCalledTimes(1);
  });
  it('D040: replay of a task deleted in Google reports that and never recreates it',async()=>{
    const upstream=vi.spyOn(adapter,'create');
    const ref=await propose();
    expect((await decide(ref,'approve')).status).toBe(200);
    await service.call('create_task',create);
    vi.spyOn(adapter,'get').mockRejectedValueOnce(new AppError('NOT_FOUND','找不到任務。'));
    await expect(service.call('create_task',create)).rejects.toMatchObject({code:'NOT_FOUND'});
    expect(upstream).toHaveBeenCalledTimes(1);
  });
  it('D040: rejection, unknown outcomes and interrupted writes leave no content',async()=>{
    const rejected=await propose();
    expect((await decide(rejected,'reject')).status).toBe(200);
    expect(dump()).not.toContain('Practice exam');
    vi.spyOn(adapter,'create').mockRejectedValueOnce(new Error('network timeout'));
    const unknownInput={...create,title:'結果不明內容',idempotencyKey:'k2'};
    const unknown=await propose(unknownInput);
    expect((await decide(unknown,'approve')).status).toBe(200);
    await expect(service.call('create_task',unknownInput)).rejects.toMatchObject({code:'WRITE_OUTCOME_UNKNOWN'});
    expect(dump()).not.toContain('結果不明內容');
    let observed='';
    vi.spyOn(adapter,'create').mockImplementationOnce(()=>{observed=dump();throw new Error('crash');});
    const crashInput={...create,title:'送出中內容',idempotencyKey:'k3'};
    const crash=await propose(crashInput);
    expect((await decide(crash,'approve')).status).toBe(200);
    await expect(service.call('create_task',crashInput)).rejects.toBeDefined();
    expect(observed).not.toBe('');expect(observed).not.toContain('送出中內容');
  });
  it('D040: an undecided proposal is erased after 24 hours and cannot be approved or written',async()=>{
    const upstream=vi.spyOn(adapter,'create');
    const ref=await propose(),page=await call('GET',`/approve/${ref}`);
    const form=new URLSearchParams({csrf:hidden(page.body,'csrf'),digest:hidden(page.body,'digest'),decision:'approve'}).toString();
    store.db.prepare('UPDATE operations SET created=? WHERE ref=?').run(Date.now()-86_400_001,ref);
    expect((await call('GET',`/approve/${ref}`)).body).toContain('already handled');
    expect(dump()).not.toContain('Practice exam');
    expect((await call('POST',`/approve/${ref}`,{headers:browser(),body:form})).status).toBe(409);
    await expect(service.call('create_task',create)).rejects.toMatchObject({code:'OPERATION_FAILED'});
    expect(upstream).not.toHaveBeenCalled();
  });
  it('D040: startup scrub clears earlier harness steps and finished rows but keeps replay protection',()=>{
    const step=store.proposal(ctx,'authorized_crud_step','s',{title:'舊測試內容'});
    store.finish(step.ref,'succeeded',{title:'舊測試內容'});
    const old=store.proposal(ctx,'update_task','old',{title:'舊內容'});
    store.finish(old.ref,'uncertain');
    const waiting=store.proposal(ctx,'create_task','waiting',{title:'等待中內容'});
    store.scrubFinished();
    expect(dump()).not.toContain('舊測試內容');expect(dump()).not.toContain('舊內容');
    expect(dump()).toContain('等待中內容');
    expect(store.operation(ctx,old.ref)?.state).toBe('uncertain');
    expect(store.proposal(ctx,'update_task','old',{title:'舊內容'}).ref).toBe(old.ref);
    expect(()=>store.proposal(ctx,'update_task','old',{title:'不同內容'})).toThrow();
    expect(store.operation(ctx,waiting.ref)?.state).toBe('pending');
  });
  it('D040: freed database pages are overwritten',()=>{
    expect(store.db.pragma('secure_delete',{simple:true})).toBe(1);
  });
  it('rejection is durable and the same key can never write',async()=>{
    const upstream=vi.spyOn(adapter,'create');
    const ref=await propose();
    expect((await decide(ref,'reject')).status).toBe(200);
    await expect(service.call('create_task',create)).rejects.toMatchObject({code:'OPERATION_FAILED'});
    expect((await decide(ref,'approve')).status).toBe(403); // The handled page has no form to submit.
    expect(upstream).not.toHaveBeenCalled();
  });
  it.each([
    ['foreign origin',{Origin:'https://evil.example','Sec-Fetch-Site':'cross-site','Content-Type':'application/x-www-form-urlencoded'}],
    ['opaque origin',{Origin:'null','Sec-Fetch-Site':'cross-site','Content-Type':'application/x-www-form-urlencoded'}],
    ['no origin (scripted form)',{'Content-Type':'application/x-www-form-urlencoded'}],
    ['cross-site fetch metadata',{Origin:'','Sec-Fetch-Site':'cross-site','Content-Type':'application/x-www-form-urlencoded'}],
  ])('refuses a decision from %s',async(_name,headers)=>{
    const ref=await propose();
    expect((await decide(ref,'approve',headers)).status).toBe(403);
    await expect(service.call('create_task',create)).rejects.toMatchObject({code:'APPROVAL_REQUIRED'});
  });
  it('refuses a missing or wrong CSRF token and a digest that is not the proposal',async()=>{
    const ref=await propose(),page=await call('GET',`/approve/${ref}`),digest=hidden(page.body,'digest');
    for(const form of [{digest,decision:'approve'},{csrf:'x',digest,decision:'approve'},{csrf:hidden(page.body,'csrf'),digest:'0'.repeat(64),decision:'approve'}])
      expect((await call('POST',`/approve/${ref}`,{headers:browser(),body:new URLSearchParams(form).toString()})).status).toBe(403);
    await expect(service.call('create_task',create)).rejects.toMatchObject({code:'APPROVAL_REQUIRED'});
  });
  it('refuses a rebound or tunneled Host header',async()=>{
    const ref=await propose();
    for(const host of ['evil.example',`localhost:${port}`,'abc.example.com']) expect((await call('GET',`/approve/${ref}`,{headers:{Host:host}})).status).toBe(403);
  });
  it('escapes hostile task content so it cannot script or forge the page',async()=>{
    const hostile='<script>alert(1)</script><button name="decision" value="approve">x</button>';
    const ref=await propose({...create,title:hostile,idempotencyKey:'hostile'});
    const page=await call('GET',`/approve/${ref}`);
    expect(page.body).not.toContain('<script>');
    expect(page.body).toContain('&lt;script&gt;');
    expect(page.body.match(/<button/g)).toHaveLength(2);
  });
  it('a task changed after proposal cannot be approved and is never patched',async()=>{
    const before=await adapter.get(DEMO_LIST,'demo-1'),patch=vi.spyOn(adapter,'patch');
    const args={taskListId:DEMO_LIST,taskId:before.id,expectedEtag:before.etag ?? '',changes:{title:'改名'},operationKey:'u1'};
    const ref=await propose(args,'update_task');
    const page=await call('GET',`/approve/${ref}`),form=new URLSearchParams({csrf:hidden(page.body,'csrf'),digest:hidden(page.body,'digest'),decision:'approve'}).toString();
    await adapter.patch(DEMO_LIST,before.id,{notes:'外部修改'},before.etag ?? '');
    patch.mockClear();
    expect((await call('POST',`/approve/${ref}`,{headers:browser(),body:form})).status).toBe(409);
    expect((await call('GET',`/approve/${ref}`)).body).toContain('cannot be approved');
    await expect(service.call('update_task',args)).rejects.toMatchObject({code:'STALE_TASK'});
    expect(patch).not.toHaveBeenCalled();
  });
  it('a change between approval and retry is refused by the snapshot check',async()=>{
    const before=await adapter.get(DEMO_LIST,'demo-1');
    const args={taskListId:DEMO_LIST,taskId:before.id,expectedEtag:before.etag ?? '',operationKey:'c1'};
    const ref=await propose(args,'complete_task');
    expect((await decide(ref,'approve')).status).toBe(200);
    await adapter.patch(DEMO_LIST,before.id,{notes:'外部修改'},before.etag ?? '');
    const patch=vi.spyOn(adapter,'patch');
    await expect(service.call('complete_task',args)).rejects.toMatchObject({code:'STALE_TASK'});
    expect(patch).not.toHaveBeenCalled();
  });
  it('another connection can neither read nor approve the proposal',async()=>{
    const ref=await propose(),digest=store.proposal(ctx,'create_task','k1',create).digest;
    const other=realService({...ctx,connection:'connection-B'});
    await expect(other.proposalView(ref)).rejects.toMatchObject({code:'APPROVAL_INVALID'});
    await expect(other.approveOperation(ref,digest)).rejects.toMatchObject({code:'APPROVAL_INVALID'});
    expect(()=>{other.rejectOperation(ref,digest);}).toThrow();
    await expect(service.call('create_task',create)).rejects.toMatchObject({code:'APPROVAL_REQUIRED'});
  });
  it('an expired approval requires a fresh decision',async()=>{
    const upstream=vi.spyOn(adapter,'create');
    const ref=await propose();
    expect((await decide(ref,'approve')).status).toBe(200);
    store.db.prepare('UPDATE operations SET approved_until=? WHERE ref=?').run(Date.now()-1,ref);
    await expect(service.call('create_task',create)).rejects.toMatchObject({code:'APPROVAL_REQUIRED'});
    expect(upstream).not.toHaveBeenCalled();
  });
  it('concurrent retries of one approval dispatch exactly one write',async()=>{
    const upstream=vi.spyOn(adapter,'create');
    const ref=await propose();
    expect((await decide(ref,'approve')).status).toBe(200);
    const results=await Promise.allSettled(Array.from({length:20},()=>service.call('create_task',create)));
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(results.some(result=>result.status==='fulfilled')).toBe(true);
  });
  it('an unknown outcome is uncertain and never sent again',async()=>{
    const upstream=vi.spyOn(adapter,'create').mockRejectedValueOnce(new Error('network timeout'));
    const ref=await propose();
    expect((await decide(ref,'approve')).status).toBe(200);
    await expect(service.call('create_task',create)).rejects.toMatchObject({code:'WRITE_OUTCOME_UNKNOWN'});
    await expect(service.call('create_task',create)).rejects.toMatchObject({code:'WRITE_OUTCOME_UNKNOWN'});
    expect(upstream).toHaveBeenCalledTimes(1);
    expect((await call('GET',`/approve/${ref}`)).body).toContain('already handled');
  });
  it('without the desk wired, real writes stay disabled',async()=>{
    const closed=new TaskService(adapter,store,ctx,[DEMO_LIST]);
    await expect(closed.call('create_task',{...create,idempotencyKey:'closed'})).rejects.toMatchObject({code:'REAL_WRITES_DISABLED'});
  });
  it('a demo approval callback cannot stand in for the desk on real writes',async()=>{
    const upstream=vi.spyOn(adapter,'create'),requestApproval=vi.fn(async()=>true);
    await expect(service.call('create_task',create,{request:requestApproval,signal:new AbortController().signal})).rejects.toMatchObject({code:'APPROVAL_REQUIRED'});
    expect(requestApproval).not.toHaveBeenCalled();expect(upstream).not.toHaveBeenCalled();
  });
  it('model-supplied confirmation fields are rejected by the schema',async()=>{
    await expect(service.call('create_task',{...create,confirmed:true,approved:true})).rejects.toMatchObject({code:'VALIDATION_ERROR'});
  });
});

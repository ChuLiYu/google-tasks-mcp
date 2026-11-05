import { it,expect,vi } from 'vitest';
import { z } from 'zod';
import { http,HttpResponse } from 'msw';
import { mock } from './setup.js';
import { GoogleTasks } from '../src/google/index.js';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { InMemoryTransport } from '@modelcontextprotocol/server';
import { buildServer, createHandler } from '../src/mcp/index.js';
import { Store } from '../src/storage/index.js';
import { DemoTasks,DEMO_LIST } from '../src/demo/index.js';
import { TaskService } from '../src/service/index.js';

it('approval probe is service-bound, single-use and never invokes Google or grants writes',async()=>{
  const store=new Store(':memory:');
  const service=new TaskService(new GoogleTasks(async()=>{throw new Error('Must not request tokens');}),store,{principal:'probe-owner',connection:'A'});
  const calls=vi.spyOn(service,'call');
  const handler=createHandler(service,{readOnly:true,approvalProbe:true});
  const other=createHandler(new TaskService(new GoogleTasks(async()=>{throw new Error('Must not request tokens');}),store,{principal:'probe-owner',connection:'B'}),{readOnly:true,approvalProbe:true});
  const clients:Client[]=[];
  const connect=async(target:typeof handler)=>{
    const client=new Client({name:'probe-test',version:'1'},{versionNegotiation:{mode:{pin:'2026-07-28'}},capabilities:{elicitation:{form:{}}}});
    clients.push(client);
    await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'),{fetch:async(input,init)=>target.fetch(new Request(input,init))}));
    return client;
  };
  try {
    const client=await connect(handler),foreign=await connect(other);
    const sharedOwnerClient=await connect(handler);
    expect((await client.listTools()).tools.map(t=>t.name).sort()).toEqual(['check_approval_channel','get_task','list_task_lists','list_tasks','search_tasks']);
    const propose=async()=>z.object({resultType:z.literal('input_required'),requestState:z.string()}).parse(await client.callTool({name:'check_approval_channel',arguments:{}},{allowInputRequired:true})).requestState;
    const resume=(state:string,who=client,response:unknown={action:'accept',content:{approved:true}})=>who.callTool({name:'check_approval_channel',arguments:{},requestState:state,inputResponses:{approval:response}});
    const state=await propose();
    expect((await resume(state,foreign)).isError).toBe(true);
    const results=await Promise.all(Array.from({length:20},()=>resume(state)));
    expect(results.filter(r=>!r.isError)).toHaveLength(1);
    expect(results.find(r=>!r.isError)?.structuredContent).toEqual({formResponseAccepted:true,googleWritesEnabled:false,humanObservationRequired:true});
    // Shared private credentials cannot distinguish clients: this is deliberately
    // diagnostic evidence only, never trusted human or write authorization.
    expect((await resume(await propose(),sharedOwnerClient)).structuredContent).toMatchObject({googleWritesEnabled:false,humanObservationRequired:true});
    for(const response of [{action:'decline'},{action:'accept',content:{approved:false}},{action:'accept',content:{approved:'true'}}]) {
      expect((await resume(await propose(),client,response)).isError).toBe(true);
    }
    const expired=await propose();
    const clock=vi.spyOn(Date,'now').mockReturnValue(Date.now()+61_000);
    try {expect((await resume(expired)).isError).toBe(true);}finally{clock.mockRestore();}
    expect((await resume('forged')).isError).toBe(true);
    expect((await client.callTool({name:'check_approval_channel',arguments:{confirmed:true}})).isError).toBe(true);
    await expect(client.callTool({name:'create_task',arguments:{}})).rejects.toThrow('not found');
    expect(calls).not.toHaveBeenCalled();
    expect(store.db.prepare('SELECT count(*) AS n FROM operations').get()).toEqual({n:0});
  }finally{await Promise.all(clients.map(c=>c.close()));await handler.close();await other.close();store.close();}
});

it('legacy probe requires a checked form; missing client support refuses without a service call',async()=>{
  const store=new Store(':memory:');
  const service=new TaskService(new DemoTasks(store),store,{principal:'probe-owner',connection:'legacy'});
  const calls=vi.spyOn(service,'call');
  for(const supportsForm of [true,false]) {
    const server=buildServer(service,{readOnly:true,approvalProbe:true});
    const client=new Client({name:'probe-legacy',version:'1'},supportsForm ? {capabilities:{elicitation:{form:{}}}} : {});
    let checked=false;
    if(supportsForm) client.setRequestHandler('elicitation/create',async()=>({action:'accept',content:{approved:checked}}));
    const [transport,serverTransport]=InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    try {
      await client.connect(transport);
      expect((await client.callTool({name:'check_approval_channel',arguments:{}})).isError).toBe(true);
      if(supportsForm) {
        checked=true;
        expect((await client.callTool({name:'check_approval_channel',arguments:{}})).structuredContent).toMatchObject({formResponseAccepted:true,googleWritesEnabled:false});
      }
    }finally{await client.close();await server.close();}
  }
  expect(calls).not.toHaveBeenCalled();store.close();
});
it.each([[404,'NOT_FOUND'],[401,'GOOGLE_REAUTH_REQUIRED'],[403,'ACCESS_DENIED']] as const)('readonly get_task preserves upstream %s as a sanitized %s error',async(status,code)=>{
  let requests=0;
  mock.use(http.get('https://tasks.googleapis.com/tasks/v1/lists/test-list/tasks/missing-task',()=>{
    requests++;return HttpResponse.json({error:'UPSTREAM_PRIVATE_CONTENT'},{status});
  }));
  const store=new Store(':memory:');
  const server=buildServer(new TaskService(new GoogleTasks(async()=>'SYNTHETIC_TOKEN'),store,{principal:'error-test',connection:'google'}),{readOnly:true});
  const client=new Client({name:'readonly-error-test',version:'1.0'});
  const [transport,serverTransport]=InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  try {
    await client.connect(transport);
    const result=await client.callTool({name:'get_task',arguments:{taskListId:'test-list',taskId:'missing-task'}});
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({code,retryable:false,requestId:expect.any(String)});
    expect(result.structuredContent).not.toHaveProperty('task');
    expect(JSON.stringify(result)).not.toMatch(/UPSTREAM_PRIVATE_CONTENT|SYNTHETIC_TOKEN/);
    expect(requests).toBe(1);
  } finally {await client.close();await server.close();store.close();}
});
it('SDK client negotiates HTTP, lists seven tools and calls read/write/error paths',async()=>{
  const store=new Store(':memory:'),adapter=new DemoTasks(store),handler=createHandler(new TaskService(adapter,store,{principal:'local',connection:'demo'},[DEMO_LIST]));
  const client=new Client({name:'integration-test',version:'1.0'});
  const transport=new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'),{fetch:async(input,init)=>handler.fetch(new Request(input,init))});
  try {
    await client.connect(transport);expect(client.getNegotiatedProtocolVersion()).toBeTypeOf('string');console.info('Negotiated MCP protocol:',client.getNegotiatedProtocolVersion());
    const tools=await client.listTools();expect(tools.tools).toHaveLength(7);expect(tools.tools.find(t=>t.name==='create_task')?.annotations?.readOnlyHint).toBe(false);
    const search=await client.callTool({name:'search_tasks',arguments:{taskListId:DEMO_LIST,query:'第三頁'}});expect(search.structuredContent).toMatchObject({scannedPages:3,complete:true});
    const args={taskListId:DEMO_LIST,title:'SDK 測試',idempotencyKey:'sdk-1'};
    const proposal=await client.callTool({name:'create_task',arguments:args});expect(proposal.isError).toBe(true);expect(proposal.structuredContent).toMatchObject({code:'APPROVAL_REQUIRED'});
    store.approve(String(proposal.structuredContent?.operationRef));
    const created=await client.callTool({name:'create_task',arguments:args});expect(created.isError).not.toBe(true);expect(created.structuredContent).toMatchObject({mode:'demo',task:{title:'SDK 測試'}});
    const invalid=await client.callTool({name:'create_task',arguments:{...args,confirmed:true}});expect(invalid.isError).toBe(true);
  }finally{await client.close();await handler.close();store.close();}
});

it('read-only registration rejects every write before reaching the service, including concurrent calls',async()=>{
  const store=new Store(':memory:');
  const service=new TaskService(new DemoTasks(store),store,{principal:'local',connection:'demo'},[DEMO_LIST]);
  const calls=vi.spyOn(service,'call');
  const handler=createHandler(service,{readOnly:true});
  const client=new Client({name:'read-only-test',version:'1.0'});
  const transport=new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'),{fetch:async(input,init)=>handler.fetch(new Request(input,init))});
  try {
    await client.connect(transport);
    const {tools}=await client.listTools();
    expect(tools.map(t=>t.name).sort()).toEqual(['get_task','list_task_lists','list_tasks','search_tasks']);
    expect(tools.every(t=>t.annotations?.readOnlyHint===true)).toBe(true);
    const outcomes=await Promise.allSettled(Array.from({length:20},(_,i)=>client.callTool({
      name:['create_task','update_task','complete_task'][i%3]!,arguments:{confirmed:true},
    })));
    for(const result of outcomes) {
      if(result.status==='fulfilled') expect(result.value.isError).toBe(true);
      else expect(result.reason).toBeInstanceOf(Error);
    }
    expect(calls).not.toHaveBeenCalled();
    const search=await client.callTool({name:'search_tasks',arguments:{taskListId:DEMO_LIST,query:'第三頁'}});
    expect(search.structuredContent).toMatchObject({scannedPages:3,complete:true});
  }finally{await client.close();await handler.close();store.close();}
});

it('opt-in demo form approval travels through the SDK request channel and never tool arguments',async()=>{
  const store=new Store(':memory:'),adapter=new DemoTasks(store);
  const server=buildServer(new TaskService(adapter,store,{principal:'local',connection:'demo'},[DEMO_LIST]),{demoElicitation:true});
  const client=new Client({name:'synthetic-human-ui',version:'1.0'},{capabilities:{elicitation:{form:{}}}});
  let accept=false,checked=false,prompts=0;
  client.setRequestHandler('elicitation/create',async(request)=>{
    prompts++;expect(request.params.mode).toBe('form');
    expect(request.params.message).toContain('SDK approval');expect(request.params.message).toContain(DEMO_LIST);
    return {action:accept ? 'accept' : 'decline',...(accept ? {content:{approved:checked}} : {})};
  });
  const spy=vi.spyOn(adapter,'create');
  const [transport,serverTransport]=InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  try {
    await client.connect(transport);
    const args={taskListId:DEMO_LIST,title:'SDK approval',idempotencyKey:'sdk-approval'};
    const declined=await client.callTool({name:'create_task',arguments:args});
    expect(declined.structuredContent).toMatchObject({code:'APPROVAL_CANCELLED'});expect(spy).not.toHaveBeenCalled();
    accept=true;
    const unchecked=await client.callTool({name:'create_task',arguments:args});
    expect(unchecked.structuredContent).toMatchObject({code:'APPROVAL_CANCELLED'});expect(spy).not.toHaveBeenCalled();
    checked=true;
    const created=await client.callTool({name:'create_task',arguments:args});
    expect(created.isError).not.toBe(true);expect(created.structuredContent).toMatchObject({mode:'demo',task:{title:'SDK approval'}});
    await client.callTool({name:'create_task',arguments:args});
    expect(spy).toHaveBeenCalledTimes(1);expect(prompts).toBe(3);
  }finally{await client.close();await server.close();store.close();}
});

it('HTTP demo elicitation without a retained client capability fails closed',async()=>{
  const store=new Store(':memory:'),adapter=new DemoTasks(store);
  const handler=createHandler(new TaskService(adapter,store,{principal:'local',connection:'demo'},[DEMO_LIST]),{demoElicitation:true});
  const client=new Client({name:'synthetic-http-ui',version:'1.0'},{capabilities:{elicitation:{form:{}}}});
  const prompt=vi.fn(async()=>({action:'accept' as const,content:{approved:true}}));
  client.setRequestHandler('elicitation/create',prompt);
  const write=vi.spyOn(adapter,'create');
  const transport=new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'),{fetch:async(input,init)=>handler.fetch(new Request(input,init))});
  try {
    await client.connect(transport);
    const result=await client.callTool({name:'create_task',arguments:{taskListId:DEMO_LIST,title:'HTTP blocked',idempotencyKey:'http'}});
    expect(result.structuredContent).toMatchObject({code:'APPROVAL_UNAVAILABLE'});
    expect(prompt).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();
  }finally{await client.close();await handler.close();store.close();}
});

it('2026 round trips bind single-use approval to the exact operation and service account',async()=>{
  const store=new Store(':memory:'),adapter=new DemoTasks(store);
  const service=new TaskService(adapter,store,{principal:'roundtrip',connection:'demo'},[DEMO_LIST]);
  const handler=createHandler(service,{demoElicitation:true});
  const other=createHandler(new TaskService(adapter,store,{principal:'other',connection:'demo'},[DEMO_LIST]),{demoElicitation:true});
  const clients:Client[]=[];
  const connect=async(target:typeof handler)=>{
    const client=new Client({name:'modern-test',version:'1.0'},{versionNegotiation:{mode:{pin:'2026-07-28'}},capabilities:{elicitation:{form:{}}}});
    clients.push(client);
    await client.connect(new StreamableHTTPClientTransport(new URL('http://127.0.0.1:3000/mcp'),{fetch:async(input,init)=>target.fetch(new Request(input,init))}));
    return client;
  };
  const write=vi.spyOn(adapter,'create');
  try {
    const client=await connect(handler),otherClient=await connect(other);
    const args={taskListId:DEMO_LIST,title:'Modern approval',idempotencyKey:'modern-1'};
    const propose=async(key:string)=>{
      const result=await client.callTool({name:'create_task',arguments:{...args,idempotencyKey:key}},{allowInputRequired:true});
      const parsed=z.object({resultType:z.literal('input_required'),requestState:z.string(),inputRequests:z.object({approval:z.object({method:z.literal('elicitation/create')})})}).parse(result);
      return parsed.requestState;
    };
    const resume=(state:string,key:string,content:unknown={action:'accept',content:{approved:true}},who=client,title=args.title)=>who.callTool({name:'create_task',arguments:{...args,title,idempotencyKey:key},requestState:state,inputResponses:{approval:content}});
    const nonce=await propose('modern-1');expect(write).not.toHaveBeenCalled();
    const foreign=await resume(nonce,'modern-1',undefined,otherClient);expect(foreign.structuredContent).toMatchObject({code:'APPROVAL_CANCELLED'});
    const results=await Promise.all(Array.from({length:20},()=>resume(nonce,'modern-1')));
    expect(results.filter(r=>!r.isError)).toHaveLength(1);expect(write).toHaveBeenCalledTimes(1);
    expect((await client.callTool({name:'create_task',arguments:args})).isError).not.toBe(true);expect(write).toHaveBeenCalledTimes(1);
    for(const [key,response] of [['declined',{action:'decline'}],['unchecked',{action:'accept',content:{approved:false}}],['malformed',{action:'accept',content:{approved:'true'}}]] as const) {
      const state=await propose(key);expect((await resume(state,key,response)).structuredContent).toMatchObject({code:'APPROVAL_CANCELLED'});
      expect((await resume(state,key)).structuredContent).toMatchObject({code:'APPROVAL_CANCELLED'});
    }
    const changed=await propose('changed');expect((await resume(changed,'changed',undefined,client,'Changed content')).isError).toBe(true);
    const expired=await propose('expired');const now=Date.now();const clock=vi.spyOn(Date,'now').mockReturnValue(now+61_000);
    try {expect((await resume(expired,'expired')).structuredContent).toMatchObject({code:'APPROVAL_CANCELLED'});}finally{clock.mockRestore();}
    expect((await resume('forged','forged')).structuredContent).toMatchObject({code:'APPROVAL_CANCELLED'});
    expect(write).toHaveBeenCalledTimes(1);
  } finally {await Promise.all(clients.map(c=>c.close()));await handler.close();await other.close();store.close();}
});

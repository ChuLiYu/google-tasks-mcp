import { request } from 'node:http';
import { it,expect,vi } from 'vitest';
import { http,passthrough } from 'msw';
import { Client,StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { mock } from './setup.js';
import { Store } from '../src/storage/index.js';
import { DemoTasks,DEMO_LIST } from '../src/demo/index.js';
import { TaskService } from '../src/service/index.js';
import { privateHttp } from '../src/mcp/private-http.js';

async function fixture(approvalProbe=false) {
  mock.use(http.all(/^http:\/\/127\.0\.0\.1:\d+\//,()=>passthrough()));
  const store=new Store(':memory:');
  const service=new TaskService(new DemoTasks(store),store,{principal:'owner',connection:'synthetic'},[DEMO_LIST]);
  const calls=vi.spyOn(service,'call');
  const token='a'.repeat(64),app=privateHttp(service,token,{approvalProbe});
  await new Promise<void>(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const address=app.server.address();
  if(!address || typeof address==='string') throw new Error('No TCP listener');
  const url=new URL(`http://127.0.0.1:${address.port}/mcp`);
  return {app,store,calls,url,token};
}

it('opt-in approval diagnostic works over authenticated HTTP while writes remain unavailable',async()=>{
  const {app,store,calls,url,token}=await fixture(true);
  const client=new Client({name:'probe-http',version:'1'},{versionNegotiation:{mode:{pin:'2026-07-28'}},capabilities:{elicitation:{form:{}}}});
  try {
    await client.connect(new StreamableHTTPClientTransport(url,{requestInit:{headers:{'X-Tasks-Local-Key':token}}}));
    expect((await client.listTools()).tools.map(t=>t.name).sort()).toEqual(['check_approval_channel','get_task','list_task_lists','list_tasks','search_tasks']);
    const initial=await client.callTool({name:'check_approval_channel',arguments:{}},{allowInputRequired:true});
    if(initial.resultType!=='input_required') throw new Error('Expected diagnostic form');
    const accepted=await client.callTool({name:'check_approval_channel',arguments:{},requestState:initial.requestState,inputResponses:{approval:{action:'accept',content:{approved:true}}}});
    expect(accepted.structuredContent).toEqual({formResponseAccepted:true,googleWritesEnabled:false,humanObservationRequired:true});
    await expect(client.callTool({name:'create_task',arguments:{}})).rejects.toThrow('not found');
    expect(calls).not.toHaveBeenCalled();
    expect(store.db.prepare('SELECT count(*) AS n FROM operations').get()).toEqual({n:0});
  }finally{await client.close();await app.close();store.close();}
});

it('stateless legacy HTTP safely refuses a diagnostic when it cannot deliver a form',async()=>{
  const {app,store,calls,url,token}=await fixture(true);
  const client=new Client({name:'probe-legacy-http',version:'1'},{versionNegotiation:{mode:'legacy'},capabilities:{elicitation:{form:{}}}});
  client.setRequestHandler('elicitation/create',async()=>{throw new Error('No form should be delivered by stateless legacy HTTP');});
  try {
    await client.connect(new StreamableHTTPClientTransport(url,{requestInit:{headers:{'X-Tasks-Local-Key':token}}}));
    expect((await client.callTool({name:'check_approval_channel',arguments:{}})).structuredContent).toMatchObject({code:'APPROVAL_UNAVAILABLE'});
    expect(calls).not.toHaveBeenCalled();
  }finally{await client.close();await app.close();store.close();}
});

it('two independent HTTP clients share read-only service; reconnect and writes remain safe',async()=>{
  const {app,store,calls,url,token}=await fixture();
  const clients=[new Client({name:'codex-test',version:'1'}),new Client({name:'tunnel-test',version:'1'})];
  try {
    await Promise.all(clients.map(client=>client.connect(new StreamableHTTPClientTransport(url,{requestInit:{headers:{'X-Tasks-Local-Key':token}}}))));
    for(const client of clients) expect((await client.listTools()).tools.map(t=>t.name).sort()).toEqual(['get_task','list_task_lists','list_tasks','search_tasks']);
    const results=await Promise.all(Array.from({length:10},(_,i)=>clients[i%2]?.callTool({name:'list_task_lists',arguments:{pageSize:100}})));
    expect(results.every(result=>result && !result.isError)).toBe(true);
    calls.mockClear();
    const writes=await Promise.allSettled(clients.flatMap(client=>['create_task','update_task','complete_task'].map(name=>client.callTool({name,arguments:{confirmed:true}}))));
    expect(writes.every(result=>result.status==='rejected' || result.value.isError===true)).toBe(true);
    expect(calls).not.toHaveBeenCalled();
    await clients[0]?.close();
    expect((await clients[1]?.callTool({name:'list_tasks',arguments:{taskListId:DEMO_LIST,pageSize:2}}))?.isError).not.toBe(true);
    const reconnect=new Client({name:'reconnect-test',version:'1'});
    try {
      await reconnect.connect(new StreamableHTTPClientTransport(url,{requestInit:{headers:{'X-Tasks-Local-Key':token}}}));
      expect((await reconnect.listTools()).tools).toHaveLength(4);
    } finally {await reconnect.close();}
  } finally {await Promise.all(clients.map(client=>client.close()));await app.close();store.close();}
});

it('rejects unauthenticated, forged origin/host and oversized bodies before service access',async()=>{
  const {app,store,calls,url,token}=await fixture();
  try {
    for(const headers of [{},{'X-Tasks-Local-Key':'b'.repeat(64)}]) {
      expect((await fetch(url,{method:'POST',headers})).status).toBe(403);
    }
    expect((await fetch(url,{method:'POST',headers:{'X-Tasks-Local-Key':token,Origin:'https://evil.example'}})).status).toBe(403);
    // Node fetch normalizes Host; exercise the actual wire header with http.request.
    const forgedHost=await new Promise<number|undefined>((resolve,reject)=>{
      const req=request(url,{method:'POST',headers:{'X-Tasks-Local-Key':token,Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});
      req.on('error',reject);req.end();
    });
    expect(forgedHost).toBe(403);
    expect((await fetch(url,{method:'POST',headers:{'X-Tasks-Local-Key':token},body:'x'.repeat(65_537)})).status).toBe(413);
    expect(calls).not.toHaveBeenCalled();
    expect((await fetch(new URL('/health',url))).status).toBe(200);
    expect((await fetch(new URL('/.well-known/oauth-protected-resource',url))).status).toBe(404);
  } finally {await app.close();store.close();}
});

it('refuses malformed private credentials before listening',()=>{
  const store=new Store(':memory:');
  try {expect(()=>privateHttp(new TaskService(new DemoTasks(store),store,{principal:'owner',connection:'synthetic'}),'short')).toThrow();}
  finally {store.close();}
});

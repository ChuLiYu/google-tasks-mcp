import { PassThrough } from 'node:stream';
import { afterEach,beforeEach,expect,it } from 'vitest';
import { http,passthrough } from 'msw';
import { mock } from './setup.js';
import { Store } from '../src/storage/index.js';
import { DemoTasks,DEMO_LIST } from '../src/demo/index.js';
import { TaskService } from '../src/service/index.js';
import { privateHttp } from '../src/mcp/private-http.js';
import { bridge } from '../src/mcp/stdio-bridge.js';

const token='b'.repeat(64);
let store:Store,app:ReturnType<typeof privateHttp>,url:string;
beforeEach(async()=>{
  mock.use(http.all(/^http:\/\/127\.0\.0\.1:\d+\//,()=>passthrough()));
  store=new Store(':memory:');
  const service=new TaskService(new DemoTasks(store),store,{principal:'owner',connection:'c'},[DEMO_LIST]);
  app=privateHttp(service,token,{readOnly:false});
  await new Promise<void>(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const address=app.server.address();
  if(!address || typeof address==='string') throw new Error('No TCP listener');
  url=`http://127.0.0.1:${address.port}/mcp`;
});
afterEach(async()=>{await app.close();store.close();});
async function exchange(lines:string[],target={url,token}) {
  const input=new PassThrough(),output=new PassThrough();let text='';
  output.setEncoding('utf8');output.on('data',(c:string)=>{text+=c;});
  const done=bridge(input,output,target);
  for(const line of lines) input.write(`${line}\n`);
  input.end();await done;
  return text.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line) as {id?:number;result?:{tools?:{name:string}[];protocolVersion?:string};error?:{code:number;message:string}});
}
const initialize=JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'claude-desktop-test',version:'1'}}});
it('relays initialize and tool discovery from a stdio client to the shared service',async()=>{
  const [init]=await exchange([initialize]);
  expect(init?.result?.protocolVersion).toBe('2025-11-25');
  const replies=await exchange([JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/list',params:{}})]);
  expect(replies[0]?.result?.tools?.map(tool=>tool.name)).toContain('create_task');
});
it('notifications produce no output and malformed input gets a parse error',async()=>{
  expect(await exchange([JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})])).toEqual([]);
  expect((await exchange(['not json']))[0]?.error?.code).toBe(-32700);
});
it('an unreachable service answers the request with no credential or address in the error',async()=>{
  const [reply]=await exchange([JSON.stringify({jsonrpc:'2.0',id:9,method:'tools/list',params:{}})],{url:'http://127.0.0.1:9/mcp',token});
  expect(reply).toMatchObject({id:9,error:{code:-32000}});
  expect(JSON.stringify(reply)).not.toContain(token);
  expect(JSON.stringify(reply)).not.toContain('127.0.0.1');
});
it('a wrong local key does not reach the tools',async()=>{
  const [reply]=await exchange([JSON.stringify({jsonrpc:'2.0',id:3,method:'tools/list',params:{}})],{url,token:'c'.repeat(64)});
  expect(reply).toMatchObject({id:3,error:{code:-32000}});
});

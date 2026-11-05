import { request } from 'node:http';
import { createHash } from 'node:crypto';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { Store } from '../src/storage/index.js';
import { DemoTasks,DEMO_LIST } from '../src/demo/index.js';
import { TaskService } from '../src/service/index.js';
import { publicHttp,type GrantStore } from '../src/mcp/public-http.js';

const PUBLIC='https://tasks.example.test',HOST='tasks.example.test',CALLBACK='https://claude.ai/api/mcp/auth_callback',DESK='http://127.0.0.1:3003';
const verifier='v'.repeat(64),challenge=createHash('sha256').update(verifier).digest('base64url');
let store:Store,adapter:DemoTasks,app:ReturnType<typeof publicHttp>,port:number,records:Map<string,unknown>;
type Reply={status:number;body:string;headers:Record<string,string|string[]|undefined>};
function call(method:string,path:string,options:{headers?:Record<string,string>;body?:string;host?:string}={}):Promise<Reply> {
  return new Promise((resolve,reject)=>{
    const req=request({host:'127.0.0.1',port,method,path,headers:{Host:options.host ?? HOST,...options.headers}},res=>{
      let body='';res.setEncoding('utf8');res.on('data',(c:string)=>{body+=c;});res.on('end',()=>{resolve({status:res.statusCode ?? 0,body,headers:res.headers});});
    });
    req.on('error',reject);req.end(options.body);
  });
}
const parse=(reply:Reply)=>JSON.parse(reply.body) as Record<string,string>;
const form=(values:Record<string,string>)=>({headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(values).toString()});
const authorizePath=(clientId:string,overrides:Record<string,string>={})=>`/authorize?${new URLSearchParams({response_type:'code',client_id:clientId,redirect_uri:CALLBACK,code_challenge:challenge,code_challenge_method:'S256',state:'s1',resource:`${PUBLIC}/mcp`,...overrides}).toString()}`;
const register=async()=>parse(await call('POST','/register',{headers:{'Content-Type':'application/json'},body:JSON.stringify({redirect_uris:[CALLBACK],client_name:'Claude'})})).client_id ?? '';
async function consent(clientId:string,allow=true) {
  const start=await call('GET',authorizePath(clientId));
  expect(start.status).toBe(302);
  const location=String(start.headers.location);
  expect(location.startsWith(`${DESK}/oauth/`)).toBe(true);
  const id=location.slice(`${DESK}/oauth/`.length);
  expect(app.consent.pending(id)).toMatchObject({redirectUri:CALLBACK});
  return new URL(app.consent.decide(id,allow) ?? '');
}
async function tokens(clientId:string) {
  const code=(await consent(clientId)).searchParams.get('code') ?? '';
  const reply=await call('POST','/token',form({grant_type:'authorization_code',code,client_id:clientId,code_verifier:verifier,redirect_uri:CALLBACK,resource:`${PUBLIC}/mcp`}));
  expect(reply.status).toBe(200);
  return parse(reply);
}
const rpc=(token:string,method:string,params:unknown,id=1,version='2025-11-25')=>call('POST','/mcp',{headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':version},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});
beforeEach(async()=>{
  store=new Store(':memory:');adapter=new DemoTasks(store);
  Object.defineProperty(adapter,'mode',{value:'google'});
  records=new Map();
  const grants:GrantStore={get:id=>records.get(id),put:(id,value)=>{records.set(id,value);},delete:id=>{records.delete(id);},clients:()=>[...records.keys()].filter(id=>id.startsWith('client:'))};
  const service=new TaskService(adapter,store,{principal:'owner',connection:'c'},[],10,{mode:'local-approval',approvalUrl:ref=>`${DESK}/approve/${ref}`});
  app=publicHttp(service,{publicUrl:PUBLIC,deskOrigin:DESK,grants,readOnly:false,localApproval:true});
  await new Promise<void>(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const address=app.server.address();
  if(!address || typeof address==='string') throw new Error('No TCP listener');
  port=address.port;
});
afterEach(async()=>{await app.close();store.close();});
describe('public connector endpoint',()=>{
  it('unauthenticated MCP gets 401 with the discovery pointer and no tool data',async()=>{
    const reply=await call('POST','/mcp',{headers:{'Content-Type':'application/json'},body:'{"jsonrpc":"2.0","id":1,"method":"tools/list"}'});
    expect(reply.status).toBe(401);
    expect(reply.headers['www-authenticate']).toBe(`Bearer resource_metadata="${PUBLIC}/.well-known/oauth-protected-resource"`);
    expect(reply.body).not.toContain('create_task');
  });
  it('publishes discovery metadata matching the connector URL',async()=>{
    expect(parse(await call('GET','/.well-known/oauth-protected-resource'))).toMatchObject({resource:`${PUBLIC}/mcp`,authorization_servers:[PUBLIC]});
    expect(parse(await call('GET','/.well-known/oauth-authorization-server'))).toMatchObject({issuer:PUBLIC,code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none'],registration_endpoint:`${PUBLIC}/register`});
  });
  it('refuses any Host other than the configured public host',async()=>{
    for(const host of ['evil.example',`127.0.0.1:${port}`,'localhost']) expect((await call('GET','/.well-known/oauth-authorization-server',{host})).status).toBe(403);
  });
  it('does not expose the approval desk or consent decisions over the tunnel',async()=>{
    for(const path of [`/approve/${'a'.repeat(48)}`,`/oauth/${'a'.repeat(43)}`,'/health']) {
      expect((await call('GET',path)).status).toBe(404);
      expect((await call('POST',path,form({decision:'approve'}))).status).toBe(404);
    }
  });
  it('registration only accepts Claude\'s exact callback',async()=>{
    for(const redirect of ['https://evil.example/cb','https://claude.ai/api/mcp/auth_callback/x','http://claude.ai/api/mcp/auth_callback',`${CALLBACK}?x=1`]) {
      const reply=await call('POST','/register',{headers:{'Content-Type':'application/json'},body:JSON.stringify({redirect_uris:[CALLBACK,redirect]})});
      expect(reply.status).toBe(400);expect(parse(reply).error).toBe('invalid_redirect_uri');
    }
    expect((await call('POST','/register',{headers:{'Content-Type':'application/json'},body:'not json'})).status).toBe(400);
  });
  it('caps stored clients by evicting the oldest',async()=>{
    const first=await register();
    for(let i=0;i<40;i++) await register();
    expect([...records.keys()].filter(id=>id.startsWith('client:')).length).toBeLessThanOrEqual(32);
    expect(records.has(`client:${first}`)).toBe(false);
  });
  it('authorize never redirects to an unregistered target and never issues a code without consent',async()=>{
    const clientId=await register();
    for(const path of [authorizePath('unknown'),authorizePath(clientId,{redirect_uri:'https://evil.example/cb'})]) {
      const reply=await call('GET',path);
      expect(reply.status).toBe(400);expect(reply.headers.location).toBeUndefined();
    }
    for(const bad of [{code_challenge_method:'plain'},{code_challenge:'short'},{response_type:'token'},{resource:'https://other.example/mcp'}]) {
      const reply=await call('GET',authorizePath(clientId,bad));
      expect(reply.status).toBe(302);
      const target=new URL(String(reply.headers.location));
      expect(target.origin+target.pathname).toBe(CALLBACK);
      expect(target.searchParams.get('error')).toBe('invalid_request');expect(target.searchParams.get('code')).toBeNull();
    }
  });
  it('owner refusal returns access_denied and no code',async()=>{
    const target=await consent(await register(),false);
    expect(target.searchParams.get('error')).toBe('access_denied');
    expect(target.searchParams.get('code')).toBeNull();
    expect(target.searchParams.get('state')).toBe('s1');
  });
  it('a consent decision is single use',async()=>{
    const clientId=await register(),start=await call('GET',authorizePath(clientId));
    const id=String(start.headers.location).slice(`${DESK}/oauth/`.length);
    expect(app.consent.decide(id,true)).toBeDefined();
    expect(app.consent.decide(id,true)).toBeUndefined();
    expect(app.consent.pending(id)).toBeUndefined();
  });
  it('full flow reaches tools; tokens are stored hashed only',async()=>{
    const issued=await tokens(await register());
    expect(issued).toMatchObject({token_type:'Bearer'});
    const access=issued.access_token ?? '';
    const listed=await rpc(access,'tools/list',{});
    expect(listed.status).toBe(200);
    expect(listed.body).toContain('create_task');
    expect(JSON.stringify([...records])).not.toContain(access);
    expect(JSON.stringify([...records])).not.toContain(issued.refresh_token ?? 'absent');
  });
  it('code exchange enforces PKCE, client, redirect, resource and single use',async()=>{
    const clientId=await register();
    const base=async()=>({grant_type:'authorization_code',code:(await consent(clientId)).searchParams.get('code') ?? '',client_id:clientId,code_verifier:verifier,redirect_uri:CALLBACK});
    for(const change of [{code_verifier:'w'.repeat(64)},{client_id:'other'},{redirect_uri:'https://evil.example/cb'},{resource:'https://other.example/mcp'}]) {
      const reply=await call('POST','/token',form({...await base(),...change}));
      expect(reply.status).toBe(400);expect(parse(reply).error).toBe('invalid_grant');
    }
    const values=await base();
    expect((await call('POST','/token',form(values))).status).toBe(200);
    const replay=await call('POST','/token',form(values));
    expect(replay.status).toBe(400);expect(parse(replay).error).toBe('invalid_grant');
  });
  it('a failed verifier also burns the code',async()=>{
    const clientId=await register(),code=(await consent(clientId)).searchParams.get('code') ?? '';
    const values={grant_type:'authorization_code',code,client_id:clientId,redirect_uri:CALLBACK};
    expect((await call('POST','/token',form({...values,code_verifier:'w'.repeat(64)}))).status).toBe(400);
    expect((await call('POST','/token',form({...values,code_verifier:verifier}))).status).toBe(400);
  });
  it('refresh rotates; the old refresh token returns invalid_grant',async()=>{
    const clientId=await register(),issued=await tokens(clientId);
    const refresh=issued.refresh_token ?? '';
    const next=await call('POST','/token',form({grant_type:'refresh_token',refresh_token:refresh,client_id:clientId}));
    expect(next.status).toBe(200);
    expect(parse(next).refresh_token).not.toBe(refresh);
    expect((await rpc(parse(next).access_token ?? '','tools/list',{})).status).toBe(200);
    const again=await call('POST','/token',form({grant_type:'refresh_token',refresh_token:refresh,client_id:clientId}));
    expect(again.status).toBe(400);expect(parse(again).error).toBe('invalid_grant');
  });
  it('refresh is bound to its client and unknown grants are refused',async()=>{
    const clientId=await register(),issued=await tokens(clientId);
    const reply=await call('POST','/token',form({grant_type:'refresh_token',refresh_token:issued.refresh_token ?? '',client_id:'other'}));
    expect(reply.status).toBe(400);expect(parse(reply).error).toBe('invalid_grant');
    expect(parse(await call('POST','/token',form({grant_type:'client_credentials'}))).error).toBe('unsupported_grant_type');
  });
  it('expired and invalid bearer tokens get 401 and cannot be refreshed once expired',async()=>{
    const clientId=await register(),issued=await tokens(clientId);
    for(const key of records.keys()) if(key.startsWith('access:') || key.startsWith('refresh:')) records.set(key,{clientId,expires:Date.now()-1});
    expect((await rpc(issued.access_token ?? '','tools/list',{})).status).toBe(401);
    expect((await rpc('x'.repeat(43),'tools/list',{})).status).toBe(401);
    expect(parse(await call('POST','/token',form({grant_type:'refresh_token',refresh_token:issued.refresh_token ?? '',client_id:clientId}))).error).toBe('invalid_grant');
  });
  it('a write through the tunnel only proposes and returns the loopback approval link',async()=>{
    const upstream=vi.spyOn(adapter,'create');
    const access=(await tokens(await register())).access_token ?? '';
    const reply=await rpc(access,'tools/call',{name:'create_task',arguments:{taskListId:DEMO_LIST,title:'Synthetic task',taskDate:'2026-12-01',idempotencyKey:'remote'}});
    expect(reply.status).toBe(200);
    expect(reply.body).toContain('APPROVAL_REQUIRED');
    expect(reply.body).toContain(`${DESK}/approve/`);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('rejects a public URL that is not a bare HTTPS origin',()=>{
    const service=new TaskService(adapter,store,{principal:'owner',connection:'c'});
    const grants:GrantStore={get:()=>undefined,put:()=>undefined,delete:()=>undefined,clients:()=>[]};
    for(const publicUrl of ['http://tasks.example.test','https://tasks.example.test/path','https://tasks.example.test/?x=1']) expect(()=>publicHttp(service,{publicUrl,deskOrigin:DESK,grants})).toThrow();
  });
});

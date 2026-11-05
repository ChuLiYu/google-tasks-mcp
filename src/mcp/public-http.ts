import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { hostHeaderValidation, toNodeHandler } from '@modelcontextprotocol/node';
import { z } from 'zod';
import { createHandler } from './index.js';
import type { TaskService } from '../service/index.js';

// One owner's connector endpoint behind a tunnel. Not multi-user sign-in: consent is granted
// only on the owner's loopback desk with the owner code, so reaching this listener alone never yields a token.
export type GrantStore = {get:(id:string)=>unknown;put:(id:string,value:unknown)=>void;delete:(id:string)=>void;clients:()=>string[]};
export type PendingConsent = {redirectUri:string;writes:boolean};
export type OwnerConsent = {pending:(id:string)=>PendingConsent|undefined;decide:(id:string,allow:boolean)=>string|undefined};
const CLAUDE_CALLBACK='https://claude.ai/api/mcp/auth_callback';
const ACCESS_TTL=3_600_000,REFRESH_TTL=30*86_400_000,CODE_TTL=60_000,CONSENT_TTL=300_000,MAX_CLIENTS=32,MAX_PENDING=32;
type Authorization={clientId:string;redirectUri:string;challenge:string;state?:string;expires:number};
// writes binds a token to the mode it was granted under, so enabling writes needs a new consent.
const grant=z.object({clientId:z.string(),expires:z.number(),writes:z.boolean().optional()});
const client=z.object({redirectUris:z.array(z.string()),created:z.number()});
const digest=(value:string)=>createHash('sha256').update(value).digest('base64url');
const opaque=()=>randomBytes(32).toString('base64url');
const json=(res:ServerResponse,status:number,body:unknown,headers:Record<string,string>={})=>{
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store',...headers});res.end(JSON.stringify(body));
};
function readBody(req:IncomingMessage):Promise<string> {
  return new Promise((resolve,reject)=>{
    let body='';req.setEncoding('utf8');
    req.on('data',(chunk:string)=>{body+=chunk;if(body.length>16_384) {reject(new Error('too large'));req.destroy();}});
    req.on('end',()=>resolve(body));req.on('error',reject);
  });
}
export function publicHttp(service:TaskService,options:{publicUrl:string;deskOrigin:string;grants:GrantStore;readOnly?:boolean;localApproval?:boolean;directWrites?:boolean}) {
  const base=new URL(options.publicUrl);
  if(base.protocol!=='https:' || base.pathname!=='/' || base.search || base.hash) throw new Error('Public URL must be a bare HTTPS origin');
  const issuer=base.origin,resource=`${issuer}/mcp`,metadataUrl=`${issuer}/.well-known/oauth-protected-resource`;
  const handler=createHandler(service,{readOnly:options.readOnly ?? true,localApproval:options.localApproval,directWrites:options.directWrites});
  const nodeHandler=toNodeHandler(handler,{maxRequestBodySize:65_536});
  const host=hostHeaderValidation([base.hostname]);
  const writes=!(options.readOnly ?? true);
  const pending=new Map<string,Authorization>(),codes=new Map<string,Authorization>();
  const prune=(map:Map<string,Authorization>)=>{for(const [key,value] of map) if(value.expires<=Date.now()) map.delete(key);};
  const issue=(clientId:string)=>{
    const access=opaque(),refresh=opaque(),now=Date.now();
    options.grants.put(`access:${digest(access)}`,{clientId,expires:now+ACCESS_TTL,writes});
    options.grants.put(`refresh:${digest(refresh)}`,{clientId,expires:now+REFRESH_TTL,writes});
    return {access_token:access,token_type:'Bearer',expires_in:ACCESS_TTL/1000,refresh_token:refresh,scope:'tasks.mcp'};
  };
  const lookup=(kind:'access'|'refresh',value:string)=>{
    const id=`${kind}:${digest(value)}`,parsed=grant.safeParse(options.grants.get(id));
    if(!parsed.success) return undefined;
    if(parsed.data.expires<=Date.now() || parsed.data.writes!==writes) {options.grants.delete(id);return undefined;}
    return {id,...parsed.data};
  };
  const consent:OwnerConsent={
    pending:id=>{prune(pending);const entry=pending.get(id);return entry ? {redirectUri:entry.redirectUri,writes} : undefined;},
    decide:(id,allow)=>{
      prune(pending);
      const entry=pending.get(id);
      if(!entry) return undefined;
      pending.delete(id);
      const target=new URL(entry.redirectUri);
      if(entry.state!==undefined) target.searchParams.set('state',entry.state);
      target.searchParams.set('iss',issuer);
      if(allow) {
        prune(codes);
        const code=opaque();
        codes.set(digest(code),{...entry,expires:Date.now()+CODE_TTL});
        target.searchParams.set('code',code);
      } else target.searchParams.set('error','access_denied');
      return target.href;
    },
  };
  const register=async(req:IncomingMessage,res:ServerResponse)=>{
    const parsed=z.object({redirect_uris:z.array(z.string()).min(1).max(4),client_name:z.string().max(200).optional()}).safeParse(JSON.parse(await readBody(req)));
    // Exact allowlist: a registration can never send an authorization code anywhere but Claude.
    if(!parsed.success || parsed.data.redirect_uris.some(uri=>uri!==CLAUDE_CALLBACK)) {json(res,400,{error:'invalid_redirect_uri'});return;}
    const existing=options.grants.clients();
    for(const stale of existing.slice(0,Math.max(0,existing.length-MAX_CLIENTS+1))) options.grants.delete(stale);
    const id=opaque();
    options.grants.put(`client:${id}`,{redirectUris:parsed.data.redirect_uris,created:Date.now()});
    json(res,201,{client_id:id,redirect_uris:parsed.data.redirect_uris,token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code'],client_id_issued_at:Math.floor(Date.now()/1000)});
  };
  const authorize=(url:URL,res:ServerResponse)=>{
    const q=url.searchParams,clientId=q.get('client_id') ?? '',redirectUri=q.get('redirect_uri') ?? '';
    const known=client.safeParse(options.grants.get(`client:${clientId}`));
    // Invalid client or redirect never redirects; the browser stays on this error.
    if(!known.success || !known.data.redirectUris.includes(redirectUri)) {json(res,400,{error:'invalid_client'});return;}
    const challenge=q.get('code_challenge') ?? '',requested=q.get('resource'),state=q.get('state') ?? undefined;
    if(q.get('response_type')!=='code' || q.get('code_challenge_method')!=='S256' || !/^[A-Za-z0-9_-]{43}$/.test(challenge) || (requested!==null && requested!==resource)) {
      const target=new URL(redirectUri);
      target.searchParams.set('error','invalid_request');
      if(state!==undefined) target.searchParams.set('state',state);
      res.writeHead(302,{Location:target.href}).end();return;
    }
    prune(pending);
    if(pending.size>=MAX_PENDING) {const oldest=pending.keys().next().value;if(oldest!==undefined) pending.delete(oldest);}
    const id=opaque();
    pending.set(id,{clientId,redirectUri,challenge,...(state!==undefined ? {state} : {}),expires:Date.now()+CONSENT_TTL});
    res.writeHead(302,{Location:`${options.deskOrigin}/oauth/${id}`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}).end();
  };
  const token=async(req:IncomingMessage,res:ServerResponse)=>{
    const form=new URLSearchParams(await readBody(req)),type=form.get('grant_type'),clientId=form.get('client_id') ?? '';
    if(type==='authorization_code') {
      prune(codes);
      const key=digest(form.get('code') ?? ''),entry=codes.get(key);
      codes.delete(key); // Single use even when verification below fails.
      const expected=Buffer.from(entry?.challenge ?? ''),received=Buffer.from(digest(form.get('code_verifier') ?? ''));
      const requested=form.get('resource');
      if(!entry || entry.clientId!==clientId || entry.redirectUri!==form.get('redirect_uri') || expected.length!==received.length || !timingSafeEqual(expected,received) || (requested!==null && requested!==resource)) {json(res,400,{error:'invalid_grant'});return;}
      json(res,200,issue(clientId));return;
    }
    if(type==='refresh_token') {
      const old=lookup('refresh',form.get('refresh_token') ?? '');
      if(!old || old.clientId!==clientId) {json(res,400,{error:'invalid_grant'});return;}
      options.grants.delete(old.id); // Rotation: the previous token dies with this response.
      json(res,200,issue(clientId));return;
    }
    json(res,400,{error:'unsupported_grant_type'});
  };
  const handle=async(req:IncomingMessage,res:ServerResponse)=>{
    if(!host(req,res)) return;
    const url=new URL(req.url ?? '/',issuer),path=url.pathname;
    if(req.method==='GET' && (path==='/.well-known/oauth-protected-resource' || path==='/.well-known/oauth-protected-resource/mcp')) {
      json(res,200,{resource,authorization_servers:[issuer],bearer_methods_supported:['header'],scopes_supported:['tasks.mcp']});return;
    }
    if(req.method==='GET' && path==='/.well-known/oauth-authorization-server') {
      json(res,200,{issuer,authorization_endpoint:`${issuer}/authorize`,token_endpoint:`${issuer}/token`,registration_endpoint:`${issuer}/register`,response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],code_challenge_methods_supported:['S256'],token_endpoint_auth_methods_supported:['none'],scopes_supported:['tasks.mcp','offline_access']});return;
    }
    if(req.method==='POST' && path==='/register') {await register(req,res);return;}
    if(req.method==='GET' && path==='/authorize') {authorize(url,res);return;}
    if(req.method==='POST' && path==='/token') {await token(req,res);return;}
    if(path!=='/mcp') {res.writeHead(404).end();return;}
    const header=req.headers.authorization ?? '',bearer=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(header)?.[1];
    if(!bearer || !lookup('access',bearer)) {
      json(res,401,{error:'invalid_token'},{'WWW-Authenticate':`Bearer resource_metadata="${metadataUrl}"`});return;
    }
    await nodeHandler(req,res);
  };
  let inflight=0;
  const server=createServer((req,res)=>{
    if(inflight>=20) {res.writeHead(503).end();return;}
    inflight++;
    void handle(req,res).catch(()=>{if(!res.headersSent) json(res,400,{error:'invalid_request'});else res.end();})
      .finally(()=>{inflight--;});
  });
  server.requestTimeout=15_000;server.headersTimeout=10_000;server.maxConnections=32;
  return {server,consent,close:async()=>{
    const closed=new Promise<void>((resolve,reject)=>server.close(error=>error ? reject(error) : resolve()));
    server.closeAllConnections();
    await closed;await handler.close();
  }};
}

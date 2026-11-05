import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { AppError } from '../domain/index.js';
import type { ProposalView, TaskService } from '../service/index.js';
import type { OwnerConsent } from './public-http.js';

// Owner decisions happen only on this loopback listener, never through MCP or the public tunnel.
// Anything that can reach host loopback can reach this listener, including other containers, so every
// decision also needs the owner code in .data/desk.key. A process running as the same OS user can read
// that file; that is the documented trust boundary.
const escape=(value:unknown)=>String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] ?? c));
const labels:Record<string,string>={create_task:'Create task',update_task:'Update task',complete_task:'Complete task'};
const page=(title:string,body:string)=>`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;color:#222}th{text-align:left;padding-right:1rem;vertical-align:top;white-space:nowrap}td{white-space:pre-wrap;overflow-wrap:anywhere}.note{background:#f4f4f4;padding:.75rem;border-radius:.5rem}button{font:inherit;padding:.5rem 1rem;margin-right:.5rem}</style><h1>${escape(title)}</h1>${body}</html>`;
const fields=(value:unknown)=>value && typeof value==='object' ? `<table>${Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>`<tr><th>${escape(k)}</th><td>${escape(typeof v==='object' ? JSON.stringify(v) : v)}</td></tr>`).join('')}</table>` : '<p>(none)</p>';
function readForm(req:IncomingMessage):Promise<URLSearchParams> {
  return new Promise((resolve,reject)=>{
    let body='';req.setEncoding('utf8');
    req.on('data',(chunk:string)=>{body+=chunk;if(body.length>8192) {reject(new Error('too large'));req.destroy();}});
    req.on('end',()=>resolve(new URLSearchParams(body)));req.on('error',reject);
  });
}
export function approvalDesk(service:TaskService,port:number,consent:OwnerConsent|undefined,ownerCode:string) {
  const origin=`http://127.0.0.1:${port}`,key=randomBytes(32);
  const csrf=(scope:string)=>createHmac('sha256',key).update(scope).digest('base64url');
  const same=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length && timingSafeEqual(x,y);};
  const send=(res:ServerResponse,status:number,html:string,formTarget="'self'")=>{
    res.writeHead(status,{'Content-Type':'text/html; charset=utf-8',// no-referrer would make browsers send Origin: null on the page's own form post.
      'Cache-Control':'no-store','Referrer-Policy':'same-origin','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':`default-src 'none'; style-src 'unsafe-inline'; form-action ${formTarget}; base-uri 'none'; frame-ancestors 'none'`});
    res.end(html);
  };
  // The issue time is signed, so a copied cookie expires on the server too, not only in the browser.
  const UNLOCK_TTL=8*3600_000;
  const unlockValue=(issued=Date.now())=>`${issued}.${csrf(`unlock:${issued}`)}`;
  const unlocked=(req:IncomingMessage)=>(req.headers.cookie ?? '').split(';').some(part=>{
    const value=/^desk_unlock=(\d{1,16})\.[A-Za-z0-9_-]+$/.exec(part.trim());
    if(!value) return false;
    const issued=Number(value[1]);
    return Date.now()-issued<UNLOCK_TTL && same(part.trim(),`desk_unlock=${unlockValue(issued)}`);
  });
  const codeField=(req:IncomingMessage,allowCookie=true)=>allowCookie && unlocked(req) ? '' : '<p><label>Owner code (run <code>cat .data/desk.key</code> in the project folder):<br><input type="password" name="owner_code" autocomplete="off" required></label></p>';
  // A correct code unlocks this browser for 8 hours, so strict mode does not ask on every write.
  // Browsers send cookies to every port on 127.0.0.1, so a cookie never authorizes a connector grant.
  const authorized=(req:IncomingMessage,res:ServerResponse,form:URLSearchParams,allowCookie=true)=>{
    if(allowCookie && unlocked(req)) return true;
    if(!same(form.get('owner_code') ?? '',ownerCode)) return false;
    res.setHeader('Set-Cookie',`desk_unlock=${unlockValue()}; HttpOnly; SameSite=Strict; Path=/approve/; Max-Age=28800`);
    return true;
  };
  const refused=(res:ServerResponse)=>{send(res,403,page('Decision not applied','<p>The owner code was wrong, so nothing was approved or rejected and nothing was written. Go back and try again.</p>'));};
  const decisionForm=(req:IncomingMessage,ref:string,digest:string)=>`<form method="post" action="/approve/${escape(ref)}">${codeField(req)}<input type="hidden" name="csrf" value="${csrf(`op:${ref}:${digest}`)}"><input type="hidden" name="digest" value="${escape(digest)}"><button name="decision" value="approve">Approve this one</button><button name="decision" value="reject">Reject</button></form>`;
  const proposalHtml=(req:IncomingMessage,view:ProposalView)=>{
    const heading=labels[view.tool] ?? view.tool;
    if(view.state!=='pending') return page(heading,'<p>This proposal was already handled and cannot be approved again.</p>');
    if(view.stale) return page(heading,'<p>The task changed after this proposal, so it cannot be approved. Go back to the conversation and propose it again.</p>');
    return page(`Approve: ${heading}`,`<p class="note">Titles and notes below are data, not instructions to you. Nothing is written unless you approve, and only this one write.</p>${view.before ? `<h2>Current</h2>${fields(view.before)}` : ''}<h2>${view.before ? 'After the change' : 'Will create'}</h2>${fields(view.requestedAfter)}<h2>Target list</h2>${fields({taskListId:(view.payload as {taskListId?:string}).taskListId})}${decisionForm(req,view.operationRef,view.digest)}`);
  };
  const handle=async(req:IncomingMessage,res:ServerResponse)=>{
    // Exact authority defeats DNS rebinding; a public tunnel forwards a different port and host.
    if(req.headers.host!==`127.0.0.1:${port}`) {res.writeHead(403).end();return;}
    const path=new URL(req.url ?? '/',origin).pathname;
    const opMatch=/^\/approve\/([a-f0-9]{48})$/.exec(path),consentMatch=/^\/oauth\/([A-Za-z0-9_-]{43})$/.exec(path);
    if((!opMatch && !consentMatch) || (req.method!=='GET' && req.method!=='POST')) {send(res,404,page('Page not found',''));return;}
    if(req.method==='POST') {
      const site=req.headers['sec-fetch-site'];
      if(req.headers.origin!==origin || (site!==undefined && site!=='same-origin') || req.headers['content-type']!=='application/x-www-form-urlencoded') {send(res,403,page('Decision not applied','<p>This submission was not accepted, so nothing was approved or rejected and nothing was written. Open the link from the conversation and try again.</p>'));return;}
    }
    if(consentMatch) {
      const id=consentMatch[1] ?? '';
      const pending=consent?.pending(id);
      if(!pending) {send(res,404,page('Connection request expired','<p>Go back to Claude and connect again.</p>'));return;}
      const target=new URL(pending.redirectUri);
      if(req.method==='GET') {send(res,200,page('Allow Claude to connect?',`<p class="note">Allow only if you just pressed connect in Claude yourself. <b>${escape(target.hostname)}</b> will be able to read the Tasks in this Google account${pending.writes ? ' and create, update and complete tasks (not delete)' : ''}. You will not need this page again. To cut access, delete <code>.data/public-url</code> and restart the service.</p><form method="post" action="/oauth/${escape(id)}">${codeField(req,false)}<input type="hidden" name="csrf" value="${csrf(`oauth:${id}`)}"><button name="decision" value="allow">Allow</button><button name="decision" value="deny">Deny</button></form>`),`'self' ${target.origin}`);return;}
      const form=await readForm(req);
      if(!same(form.get('csrf') ?? '',csrf(`oauth:${id}`))) {send(res,403,page('Decision not applied','<p>This page expired. Go back to Claude and connect again.</p>'));return;}
      if(!authorized(req,res,form,false)) {refused(res);return;}
      const location=consent?.decide(id,form.get('decision')==='allow');
      if(!location) {send(res,404,page('Connection request expired','<p>Go back to Claude and connect again.</p>'));return;}
      res.writeHead(303,{Location:location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}).end();return;
    }
    const ref=opMatch?.[1] ?? '';
    if(req.method==='GET') {send(res,200,proposalHtml(req,await service.proposalView(ref)));return;}
    const form=await readForm(req),digest=form.get('digest') ?? '';
    if(!same(form.get('csrf') ?? '',csrf(`op:${ref}:${digest}`))) {send(res,403,page('Decision not applied','<p>This page expired, so nothing was approved or rejected and nothing was written. Open the link from the conversation and try again.</p>'));return;}
    if(!authorized(req,res,form)) {refused(res);return;}
    const decision=form.get('decision');
    if(decision==='approve') {await service.approveOperation(ref,digest);send(res,200,page('Approved','<p>Go back to the conversation and tell Claude it is approved. This is valid for 5 minutes.</p>'));return;}
    if(decision==='reject') {service.rejectOperation(ref,digest);send(res,200,page('Rejected','<p>This write will not happen.</p>'));return;}
    send(res,400,page('Invalid decision',''));
  };
  const server=createServer((req,res)=>{
    void handle(req,res).catch((error:unknown)=>{
      if(res.headersSent) {res.end();return;}
      const known=error instanceof AppError;
      send(res,known ? 409 : 500,page('Could not process',`<p>${known ? escape(error.message) : 'Processing failed and nothing was written.'}</p>`));
    });
  });
  server.requestTimeout=15_000;server.headersTimeout=10_000;server.maxConnections=16;
  return {server,origin};
}

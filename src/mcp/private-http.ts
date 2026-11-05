import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { localhostHostValidation, localhostOriginValidation, toNodeHandler } from '@modelcontextprotocol/node';
import { createHandler } from './index.js';
import type { TaskService } from '../service/index.js';

// One owner, one service/context, multiple clients. This is not public-user auth.
export function privateHttp(service:TaskService, token:string, options:{approvalProbe?:boolean;readOnly?:boolean;localApproval?:boolean;directWrites?:boolean}={}) {
  if(!/^[a-f0-9]{64}$/.test(token)) throw new Error('Invalid private HTTP credential');
  const expected=Buffer.from(token);
  const readOnly=options.readOnly ?? true;
  const handler=createHandler(service,{readOnly,approvalProbe:options.approvalProbe,localApproval:options.localApproval,directWrites:options.directWrites});
  const nodeHandler=toNodeHandler(handler,{maxRequestBodySize:65_536});
  const host=localhostHostValidation(),origin=localhostOriginValidation();
  let inflight=0;
  const server=createServer((req,res)=>{
    if(!host(req,res) || !origin(req,res)) return;
    if(req.url==='/health' && req.method==='GET') {
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify({service:'google-tasks-private-http',readOnly}));return;
    }
    if(req.url!=='/mcp') {res.writeHead(404).end();return;}
    const header=req.headers['x-tasks-local-key'];
    const received=Buffer.from(typeof header==='string' ? header : '');
    if(received.length!==expected.length || !timingSafeEqual(received,expected)) {
      res.writeHead(403).end();return;
    }
    if(inflight>=20) {res.writeHead(503).end();return;}
    inflight++;
    void nodeHandler(req,res).catch(()=>{if(!res.headersSent) res.writeHead(500);res.end();})
      .finally(()=>{inflight--;});
  });
  server.requestTimeout=15_000;server.headersTimeout=10_000;server.maxConnections=32;
  return {server,close:async()=>{
    const closed=new Promise<void>((resolve,reject)=>server.close(error=>error ? reject(error) : resolve()));
    server.closeAllConnections();
    await closed;await handler.close();
  }};
}

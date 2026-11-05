import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { z } from 'zod';

// Stdio clients (Claude Desktop) share the one HTTP service: same ledger, same approval desk,
// no second process touching Google or the database.
const message=z.object({id:z.union([z.string(),z.number()]).optional(),method:z.string().optional()});
const initialized=z.object({result:z.object({protocolVersion:z.string()})});
export function bridge(input:Readable,output:Writable,target:{url:string;token:string}) {
  let protocol:string|undefined;
  const emit=(raw:string,isInitialize:boolean)=>{
    if(isInitialize) {
      const parsed=initialized.safeParse(JSON.parse(raw));
      if(parsed.success) protocol=parsed.data.result.protocolVersion;
    }
    output.write(`${raw}\n`);
  };
  const forward=async(line:string)=>{
    let parsed;
    try {parsed=message.parse(JSON.parse(line));}
    catch {output.write(`${JSON.stringify({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}})}\n`);return;}
    try {
      const response=await fetch(target.url,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','X-Tasks-Local-Key':target.token,...(protocol ? {'MCP-Protocol-Version':protocol} : {})},body:line,signal:AbortSignal.timeout(60_000),redirect:'error'});
      const body=await response.text();
      const isInitialize=parsed.method==='initialize';
      if((response.headers.get('content-type') ?? '').includes('text/event-stream')) {
        for(const event of body.split('\n')) if(event.startsWith('data:') && event.slice(5).trim()) emit(event.slice(5).trim(),isInitialize);
      } else if(body.trim()) emit(body.trim(),isInitialize);
      else if(!response.ok && parsed.id!==undefined) throw new Error('upstream');
    } catch {
      // Never echo connection details; the local key travels in these requests.
      if(parsed.id!==undefined) output.write(`${JSON.stringify({jsonrpc:'2.0',id:parsed.id,error:{code:-32000,message:'Local Google Tasks service is not reachable. Start it, then retry.'}})}\n`);
    }
  };
  const pending=new Set<Promise<void>>();
  const lines=createInterface({input});
  lines.on('line',line=>{
    if(!line.trim()) return;
    const task=forward(line).finally(()=>{pending.delete(task);});
    pending.add(task);
  });
  return new Promise<void>(resolve=>{lines.on('close',()=>{void Promise.allSettled(pending).then(()=>{resolve();});});});
}

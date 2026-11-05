// Starts the built image with the runtime's hardening, on synthetic data only, and lists its tools.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const image=process.argv[2];
if(!image) {console.error('Usage: node scripts/check-container.mjs <image>');process.exit(2);}
const expected=['complete_task','create_task','get_task','list_task_lists','list_tasks','search_tasks','update_task'];
const child=spawn('docker',['run','--rm','-i','--pull','never','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:size=16m,mode=1777','--env','TASKS_DATA_DIR=/tmp/data','--entrypoint','node',image,'dist/demo-stdio.js'],{stdio:['pipe','pipe','inherit']});
const fail=reason=>{console.error(`Container check failed: ${reason}`);child.kill();process.exit(1);};
const timer=setTimeout(()=>fail('timed out'),30_000);
child.on('error',()=>fail('docker could not start'));
child.on('exit',code=>{if(code) fail(`container exited with ${String(code)}`);});
const send=(id,method,params)=>child.stdin.write(`${JSON.stringify({jsonrpc:'2.0',id,method,params})}\n`);
createInterface({input:child.stdout}).on('line',line=>{
  const reply=JSON.parse(line);
  if(reply.id===1) send(2,'tools/list',{});
  if(reply.id===2) {
    const names=(reply.result?.tools ?? []).map(tool=>tool.name).sort();
    if(names.join()!==expected.join()) fail(`unexpected tools: ${names.join()}`);
    clearTimeout(timer);
    console.log(JSON.stringify({image,tools:names.length,network:'none',readOnlyRoot:true}));
    child.removeAllListeners('exit');child.kill();process.exit(0);
  }
});
send(1,'initialize',{protocolVersion:'2025-11-25',capabilities:{},clientInfo:{name:'container-check',version:'1'}});

import { createInterface } from 'node:readline/promises';
import { stdin,stdout } from 'node:process';
import { createServer } from 'node:http';
import { googleLocal,GOOGLE_REDIRECT } from './local/google-local.js';
const args=process.argv.slice(2);
if(args.length>1 || (args.length===1 && args[0]!=='--write-test')) {console.error('Usage: node dist/connect.js [--write-test]');process.exit(1);}
const writeTest=args[0]==='--write-test';
const accessLabel=writeTest ? 'read and write access to Tasks (the model can then create, update and complete tasks directly)' : 'read-only access to Tasks';
if(!stdin.isTTY) {console.error('Run the Google connection in an interactive terminal on this computer.');process.exit(1);}
const rl=createInterface({input:stdin,output:stdout});
const answer=await rl.question(`This connects the Google account you choose and requests ${accessLabel}. The grant covers all Tasks in that account. Type CONNECT to continue: `);rl.close();
if(answer!=='CONNECT') process.exit(0);
let runtime:ReturnType<typeof googleLocal>;
try {runtime=googleLocal(true,writeTest);} catch {console.error('Invalid configuration. Run ./setup.sh again. Credential contents are not printed.');process.exit(1);}
const principal='local-os-owner';
const {state,url}=runtime.oauth.start(principal);
let busy=false;
const server=createServer((req,res)=>{
  // Exact authority and no cross-origin navigation except the provider's top-level redirect.
  if(req.headers.host!=='127.0.0.1:8787' || (req.headers.origin && req.headers.origin!=='https://accounts.google.com')) {res.writeHead(403);res.end();return;}
  const request=new URL(req.url ?? '/',GOOGLE_REDIRECT);
  if(request.pathname!=='/callback' || req.method!=='GET') {res.writeHead(404);res.end();return;}
  if(busy || request.searchParams.getAll('state').length!==1 || request.searchParams.get('state')!==state || request.searchParams.getAll('code').length!==1) {res.writeHead(400);res.end('Invalid OAuth callback.');return;}
  busy=true;
  void (async()=>{
    try {
      runtime.newConnection();
      await runtime.oauth.callback(principal,state,request.searchParams.get('code')!);
      res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.end(`Connected to Google with ${accessLabel}. You can close this page and return to the terminal.`);
      console.error(writeTest ? 'Google read and write access granted. It applies after the local service restarts.' : 'Google read-only connection complete. It applies after the local service restarts.');
    }catch {res.writeHead(400,{'Content-Type':'text/plain; charset=utf-8'});res.end('Authorization did not finish. Return to the terminal and connect again.');console.error('Google connection failed. No authorization code or token was printed.');process.exitCode=1;}
    finally {clearTimeout(timer);server.close();runtime.store.close();}
  })();
});
const timer=setTimeout(()=>{console.error('The connection timed out. Run it again.');server.close();runtime.store.close();process.exitCode=1;},300_000);
server.on('error',()=>{clearTimeout(timer);console.error('Cannot use 127.0.0.1:8787. Close any other connection process first.');runtime.store.close();process.exitCode=1;});
server.listen(8787,'127.0.0.1',()=>console.error(`Open this Google authorization URL in your browser (valid for 5 minutes):\n${url}`));

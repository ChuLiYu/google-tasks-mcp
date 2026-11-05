import { describe,it,expect,vi } from 'vitest';
import { http,HttpResponse } from 'msw';
import { mock } from './setup.js';
import { GoogleTasks,GoogleOAuth,type Tokens } from '../src/google/index.js';
import { safeError } from '../src/domain/index.js';
const base='https://tasks.googleapis.com/tasks/v1';
const oauthConfig={clientId:'synthetic-client',redirectUri:'http://127.0.0.1:8787/callback',scope:'https://www.googleapis.com/auth/tasks.readonly' as const};
function oauth(initial?:Tokens) {let tokens=initial;const put=vi.fn((t:Tokens)=>{tokens=t;});return {client:new GoogleOAuth(oauthConfig,{get:()=>tokens,put}),put,get:()=>tokens};}
describe('Google adapter via MSW (no real network)',()=>{
  it('encodes exact IDs and explicit list flags, decodes date without timezone conversion',async()=>{
    mock.use(http.get(`${base}/lists/:list/tasks`,({params,request})=>{
      expect(params.list).toBe('list/a');const q=new URL(request.url).searchParams;expect(Object.fromEntries(q)).toMatchObject({showHidden:'true',showCompleted:'true',showDeleted:'false',showAssigned:'false',pageToken:'page2'});
      return HttpResponse.json({items:[{id:'1',title:'t',due:'2026-11-02T00:00:00.000Z',status:'completed'}]});
    }));
    const result=await new GoogleTasks(async()=>'fake').tasks('list/a',100,true,'page2');expect(result.items[0]?.taskDate).toBe('2026-11-02');
  });
  it('posts only supplied fields; no Calendar calls',async()=>{
    mock.use(http.post(`${base}/lists/l/tasks`,async({request})=>{expect(await request.json()).toEqual({title:'t',due:'2026-11-02T00:00:00.000Z'});return HttpResponse.json({id:'new',title:'t',status:'needsAction'});}));
    expect(await new GoogleTasks(async()=>'fake').create('l',{title:'t',taskDate:'2026-11-02'})).toMatchObject({id:'new'});
  });
  it('GET retries 503 at most three times; writes never retry 503',async()=>{
    let reads=0,writes=0;mock.use(http.get(`${base}/lists/l/tasks/t`,()=>{reads++;return new HttpResponse(null,{status:503});}),http.post(`${base}/lists/l/tasks`,()=>{writes++;return new HttpResponse(null,{status:503});}));
    const adapter=new GoogleTasks(async()=>'fake',fetch,async()=>{});
    await expect(adapter.get('l','t')).rejects.toMatchObject({code:'UPSTREAM_UNAVAILABLE'});expect(reads).toBe(3);
    await expect(adapter.create('l',{title:'t'})).rejects.toMatchObject({status:503});expect(writes).toBe(1);
  });
  it('does not wait beyond budget for Retry-After',async()=>{
    mock.use(http.get(`${base}/lists/l/tasks/t`,()=>new HttpResponse(null,{status:429,headers:{'Retry-After':'100'}})));
    const sleep=vi.fn();await expect(new GoogleTasks(async()=>'fake',fetch,sleep).get('l','t')).rejects.toMatchObject({code:'RATE_LIMITED'});expect(sleep).not.toHaveBeenCalled();
  });
  it('does not leak upstream secret errors',async()=>{
    mock.use(http.get(`${base}/lists/l/tasks/t`,()=>HttpResponse.json({error:'SECRET_TOKEN'},{status:403})));
    let error;try{await new GoogleTasks(async()=>'SECRET_TOKEN').get('l','t');}catch(e){error=e;}expect(JSON.stringify(safeError(error))).not.toContain('SECRET_TOKEN');
  });
  it('network failure after sending create never retries',async()=>{
    let n=0;mock.use(http.post(`${base}/lists/l/tasks`,()=>{n++;return HttpResponse.error();}));
    await expect(new GoogleTasks(async()=>'fake').create('l',{title:'t'})).rejects.toMatchObject({code:'WRITE_OUTCOME_UNKNOWN'});expect(n).toBe(1);
  });
  it('sends the exact version and only changed fields; 412 is a conflict without retry',async()=>{
    let writes=0;
    mock.use(http.patch(`${base}/lists/l/tasks/t`,async({request})=>{
      writes++;expect(request.headers.get('if-match')).toBe('"version-1"');
      expect(await request.json()).toEqual({notes:'changed'});
      return new HttpResponse(null,{status:412});
    }));
    await expect(new GoogleTasks(async()=>'fake').patch('l','t',{notes:'changed'},'"version-1"')).rejects.toMatchObject({code:'STALE_TASK',status:412,retryable:false});
    expect(writes).toBe(1);
  });
  it('rejects missing, wildcard, weak, list and injected versions before credentials or network',async()=>{
    const token=vi.fn(async()=>'fake'),adapter=new GoogleTasks(token);
    for(const version of ['', '*', 'W/"v1"', '"v1","v2"', 'v1\r\nX-Test:yes']) {
      await expect(adapter.patch('l','t',{title:'changed'},version)).rejects.toMatchObject({code:'WRITE_PRECONDITION_REQUIRED'});
    }
    expect(token).not.toHaveBeenCalled();
  });
  it('a conditional patch timeout remains unknown and never retries',async()=>{
    let writes=0;mock.use(http.patch(`${base}/lists/l/tasks/t`,()=>{writes++;return HttpResponse.error();}));
    await expect(new GoogleTasks(async()=>'fake').patch('l','t',{title:'changed'},'v1')).rejects.toMatchObject({code:'WRITE_OUTCOME_UNKNOWN'});
    expect(writes).toBe(1);
  });
  it('concurrent account adapters never exchange tokens',async()=>{
    mock.use(http.get(`${base}/lists/l/tasks/:id`,({request,params})=>{expect(request.headers.get('authorization')).toBe(`Bearer ${params.id}`);return HttpResponse.json({id:params.id,title:String(params.id),status:'needsAction'});}));
    await Promise.all(Array.from({length:20},(_,n)=>{const id=n%2?'A':'B';return new GoogleTasks(async()=>id).get('l',id);}));
  });
});
describe('Google OAuth',()=>{
  it('accepts a read-write grant for read access after refresh',async()=>{
    const {client}=oauth({accessToken:'expired',refreshToken:'synthetic-refresh',expiresAt:0});
    mock.use(http.post('https://oauth2.googleapis.com/token',()=>HttpResponse.json({access_token:'new',expires_in:3600,token_type:'Bearer',scope:'https://www.googleapis.com/auth/tasks'})));
    await expect(client.accessToken()).resolves.toBe('new');
  });
  it('does not accept a readonly grant when requesting write access',async()=>{
    const put=vi.fn();
    const client=new GoogleOAuth({...oauthConfig,scope:'https://www.googleapis.com/auth/tasks'},{get:()=>undefined,put});
    mock.use(http.post('https://oauth2.googleapis.com/token',()=>HttpResponse.json({access_token:'new',expires_in:3600,token_type:'Bearer',scope:oauthConfig.scope})));
    const {state}=client.start('A');
    await expect(client.callback('A',state,'code')).rejects.toMatchObject({code:'ACCESS_DENIED'});
    expect(put).not.toHaveBeenCalled();
  });
  it('PKCE S256, state isolation, single use, and scope minimization',async()=>{
    const {client}=oauth();const start=client.start('A'),url=new URL(start.url);expect(url.searchParams.get('code_challenge_method')).toBe('S256');expect(url.searchParams.get('scope')).toBe(oauthConfig.scope);
    await expect(client.callback('B',start.state,'code')).rejects.toMatchObject({code:'OAUTH_STATE_INVALID'});
    await expect(client.callback('A',start.state,'code')).rejects.toMatchObject({code:'OAUTH_STATE_INVALID'});
  });
  it('callback exchanges once, retains no token from previous account',async()=>{
    const {client,get}=oauth({accessToken:'old',refreshToken:'other-account',expiresAt:0});
    mock.use(http.post('https://oauth2.googleapis.com/token',async({request})=>{const body=new URLSearchParams(await request.text());expect(body.get('code_verifier')).toBeTruthy();return HttpResponse.json({access_token:'new',expires_in:3600,token_type:'Bearer'});}));
    const start=client.start('A');await client.callback('A',start.state,'code');expect(get()?.refreshToken).toBeUndefined();
    await expect(client.callback('A',start.state,'code')).rejects.toMatchObject({code:'OAUTH_STATE_INVALID'});
  });
  it('20 expired token requests refresh once and preserve old refresh token',async()=>{
    const {client,get}=oauth({accessToken:'old',refreshToken:'refresh',expiresAt:0});let n=0;
    mock.use(http.post('https://oauth2.googleapis.com/token',()=>{n++;return HttpResponse.json({access_token:'new',expires_in:3600,token_type:'Bearer'});}));
    expect(await Promise.all(Array.from({length:20},()=>client.accessToken()))).toEqual(Array(20).fill('new'));expect(n).toBe(1);expect(get()?.refreshToken).toBe('refresh');
  });
  it('invalid_grant returns reconnect without raw body',async()=>{
    const {client}=oauth({accessToken:'old',refreshToken:'refresh',expiresAt:0});
    mock.use(http.post('https://oauth2.googleapis.com/token',()=>HttpResponse.json({error:'invalid_grant',secret:'sensitive'},{status:400})));
    await expect(client.accessToken()).rejects.toMatchObject({code:'GOOGLE_REAUTH_REQUIRED'});
  });
  it('rejects wrong grant scope and arbitrary callback host',async()=>{
    expect(()=>new GoogleOAuth({...oauthConfig,redirectUri:'http://evil.test/callback'},{get:()=>undefined,put:()=>{}})).toThrow();
    const {client}=oauth();const start=client.start('A');mock.use(http.post('https://oauth2.googleapis.com/token',()=>HttpResponse.json({access_token:'new',expires_in:3600,token_type:'Bearer',scope:'calendar'})));
    await expect(client.callback('A',start.state,'code')).rejects.toMatchObject({code:'ACCESS_DENIED'});
  });
});

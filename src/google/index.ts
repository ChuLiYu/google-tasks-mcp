import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { AppError, dateOnly, encodeFields, requireTaskVersion, type Page, type Task, type TaskList, type TasksAdapter, type CreateTaskFields, type PatchTaskFields } from '../domain/index.js';
const googleTask = z.object({ id: z.string().min(1), title: z.string(), notes: z.string().optional(), due: z.string().optional(), status: z.enum(['needsAction','completed']), etag: z.string().optional(), assignmentInfo: z.unknown().optional() });
function decodeTask(raw: unknown): Task {
  const { due, ...task } = googleTask.parse(raw);
  return { ...task, ...(due ? { taskDate: dateOnly.parse(due.slice(0,10)) } : {}) };
}
export class GoogleHttpError extends AppError {
  constructor(public status: number) {
    // Observed live: Google answers 400 for a malformed ID and 404 for a well-formed unknown one.
    super(status === 400 ? 'INVALID_REQUEST' : status === 401 ? 'GOOGLE_REAUTH_REQUIRED' : status === 403 ? 'ACCESS_DENIED' : status === 404 ? 'NOT_FOUND' : status === 412 ? 'STALE_TASK' : status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_UNAVAILABLE', status === 400 ? 'Google 拒絕此 ID 或參數；請用清單與任務的精確 ID，不要重試相同內容。' : status === 412 ? '任務版本已改變，請重新讀取後再操作。' : 'Google 請求未成功。', status === 429 || status >= 500);
  }
}
export class GoogleTasks implements TasksAdapter {
  readonly mode = 'google' as const;
  constructor(private token: () => Promise<string>, private fetcher: typeof fetch = fetch, private sleep = (ms:number) => new Promise<void>(r => setTimeout(r, ms))) {}
  private async request(path: string, method = 'GET', body?: unknown, expectedVersion?: string): Promise<unknown> {
    const deadline = Date.now() + 10_000;
    const access = await this.token();
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await this.fetcher(`https://tasks.googleapis.com/tasks/v1/${path}`, {
          method, headers: { Authorization: `Bearer ${access}`, ...(body ? {'Content-Type':'application/json'} : {}), ...(expectedVersion ? {'If-Match':expectedVersion} : {}) },
          ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())), redirect: 'error',
        });
      } catch {
        // Never retry a mutation, including network errors that may follow a committed write.
        throw new AppError(method === 'GET' ? 'UPSTREAM_UNAVAILABLE' : 'WRITE_OUTCOME_UNKNOWN', 'Google 連線中斷或逾時，未確認操作結果。', method === 'GET');
      }
      if (response.ok) {
        try { return await response.json(); } catch { throw new AppError(method === 'GET' ? 'UPSTREAM_UNAVAILABLE' : 'WRITE_OUTCOME_UNKNOWN', 'Google 回應無法確認。'); }
      }
      if (method === 'GET' && attempt < 2 && (response.status === 429 || response.status >= 500)) {
        const header = response.headers.get('retry-after');
        const retryAfter = header ? (/^\d+$/.test(header) ? Number(header)*1000 : Math.max(0, Date.parse(header)-Date.now())) : 150 * 2 ** attempt + Math.random()*100;
        void response.body?.cancel().catch(() => {});
        if (!Number.isFinite(retryAfter) || Date.now() + retryAfter >= deadline) throw new GoogleHttpError(response.status);
        await this.sleep(retryAfter); continue;
      }
      void response.body?.cancel().catch(() => {});
      throw new GoogleHttpError(response.status);
    }
  }
  async lists(size: number, token?: string): Promise<Page<TaskList>> {
    const q = new URLSearchParams({maxResults:String(size), ...(token ? {pageToken:token} : {})});
    return z.object({items:z.array(z.object({id:z.string(),title:z.string()})).default([]),nextPageToken:z.string().optional()}).parse(await this.request(`users/@me/lists?${q}`));
  }
  async tasks(list: string, size: number, completed: boolean, token?: string): Promise<Page<Task>> {
    const q = new URLSearchParams({maxResults:String(size),showCompleted:String(completed),showHidden:String(completed),showDeleted:'false',showAssigned:'false',...(token ? {pageToken:token} : {})});
    const page = z.object({items:z.array(z.unknown()).default([]),nextPageToken:z.string().optional()}).parse(await this.request(`lists/${encodeURIComponent(list)}/tasks?${q}`));
    return {items:page.items.map(decodeTask),nextPageToken:page.nextPageToken};
  }
  async get(list: string, task: string) { return decodeTask(await this.request(`lists/${encodeURIComponent(list)}/tasks/${encodeURIComponent(task)}`)); }
  async create(list: string, fields: CreateTaskFields) { return decodeTask(await this.request(`lists/${encodeURIComponent(list)}/tasks`,'POST',encodeFields(fields))); }
  async patch(list: string, task: string, fields: PatchTaskFields, expectedVersion: string) { return decodeTask(await this.request(`lists/${encodeURIComponent(list)}/tasks/${encodeURIComponent(task)}`,'PATCH',encodeFields(fields),requireTaskVersion(expectedVersion))); }
}
export type Tokens = { accessToken: string; refreshToken?: string; expiresAt: number };
export interface TokenStore { get(): Tokens | undefined; put(tokens: Tokens): void; }
const tokenResponse = z.object({access_token:z.string().min(1),refresh_token:z.string().optional(),expires_in:z.number().positive(),token_type:z.string().refine(s => s.toLowerCase()==='bearer'),scope:z.string().optional()});
export class GoogleOAuth {
  private states = new Map<string,{verifier:string;expires:number;principal:string}>();
  private refreshing?: Promise<string>;
  constructor(private config: {clientId:string;clientSecret?:string;redirectUri:string;scope:'https://www.googleapis.com/auth/tasks'|'https://www.googleapis.com/auth/tasks.readonly'}, private store: TokenStore, private fetcher: typeof fetch = fetch) {
    const u = new URL(config.redirectUri);
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['127.0.0.1','localhost','[::1]'].includes(u.hostname))) throw new Error('OAuth redirect must be HTTPS or loopback');
  }
  start(principal: string) {
    for (const [key,value] of this.states) if (value.expires < Date.now()) this.states.delete(key);
    if (this.states.size >= 100) throw new AppError('RATE_LIMITED','登入請求過多。');
    const state = randomBytes(32).toString('base64url'), verifier = randomBytes(48).toString('base64url');
    this.states.set(state,{principal,verifier,expires:Date.now()+300_000});
    const params = new URLSearchParams({client_id:this.config.clientId,redirect_uri:this.config.redirectUri,response_type:'code',scope:this.config.scope,access_type:'offline',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'});
    return {state,url:`https://accounts.google.com/o/oauth2/v2/auth?${params}`};
  }
  private async exchange(params: Record<string,string>, previous?: Tokens) {
    let response: Response;
    try { response = await this.fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:this.config.clientId,...(this.config.clientSecret ? {client_secret:this.config.clientSecret}:{}),...params}),signal:AbortSignal.timeout(10_000),redirect:'error'}); }
    catch { throw new AppError('GOOGLE_REAUTH_REQUIRED','Google 授權未完成，請重新連線。'); }
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new AppError('GOOGLE_REAUTH_REQUIRED','Google 授權失效或無法更新，請重新連線。');
    }
    const raw = tokenResponse.parse(await response.json());
    if (raw.scope) {
      const scopes=raw.scope.split(' ');
      const permitsRead=this.config.scope==='https://www.googleapis.com/auth/tasks.readonly' && scopes.includes('https://www.googleapis.com/auth/tasks');
      if(!scopes.includes(this.config.scope) && !permitsRead) throw new AppError('ACCESS_DENIED','Google 未授予必要權限。');
    }
    const tokens:Tokens = {accessToken:raw.access_token,refreshToken:raw.refresh_token ?? previous?.refreshToken,expiresAt:Date.now()+raw.expires_in*1000};
    this.store.put(tokens); return tokens.accessToken;
  }
  async callback(principal: string, state: string, code: string) {
    const entry = this.states.get(state); this.states.delete(state);
    if (!entry || entry.principal !== principal || entry.expires <= Date.now() || !code) throw new AppError('OAUTH_STATE_INVALID','登入驗證已失效，請重新開始。');
    // Each new authorization is a new connection. Never inherit a prior account's refresh token.
    return this.exchange({code,code_verifier:entry.verifier,redirect_uri:this.config.redirectUri,grant_type:'authorization_code'});
  }
  async accessToken() {
    const tokens = this.store.get();
    if (!tokens) throw new AppError('GOOGLE_REAUTH_REQUIRED','請先連接 Google。');
    if (tokens.expiresAt > Date.now()+30_000) return tokens.accessToken;
    if (!tokens.refreshToken) throw new AppError('GOOGLE_REAUTH_REQUIRED','缺少離線授權，請重新連接 Google。');
    if (!this.refreshing) this.refreshing = this.exchange({grant_type:'refresh_token',refresh_token:tokens.refreshToken},tokens).finally(() => {this.refreshing=undefined;});
    return this.refreshing;
  }
}

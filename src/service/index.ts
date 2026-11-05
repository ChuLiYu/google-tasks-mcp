import { z } from 'zod';
import { AppError, hash, schemas, requireTaskVersion, type Context, type Task, type TasksAdapter, type ToolName } from '../domain/index.js';
import { GoogleHttpError } from '../google/index.js';
import { Store } from '../storage/index.js';
type CursorState = {token?:string;seen:string[]};
export type ApprovalPreview = {operationRef:string;digest:string;tool:ToolName;payload:unknown;before:Task|null;requestedAfter:unknown};
// Server-supplied callback only. Never deserialize this from tool arguments.
export type DemoApproval = {request:(preview:ApprovalPreview,signal:AbortSignal)=>Promise<boolean>;signal:AbortSignal};
// Chosen by the entrypoint, never by a tool argument. Direct: the owner's connection grant is the
// authorization (D041). Local approval: each write waits for a decision on the loopback desk (D039).
export type RealWrites = {mode:'direct'} | {mode:'local-approval';approvalUrl:(operationRef:string)=>string};
export type ProposalView = ApprovalPreview & {state:string;stale:boolean};
const requestedAfter=(name:ToolName,args:unknown,before:Task|undefined):unknown=>{
  if(name==='create_task') {
    const {title,notes,taskDate}=schemas.create_task.parse(args);
    return {title,notes,taskDate,status:'needsAction'};
  }
  // Expected content only; the new upstream version is not known yet.
  const content=before ? {title:before.title,notes:before.notes,taskDate:before.taskDate,status:before.status} : {};
  return name==='update_task' ? {...content,...schemas.update_task.parse(args).changes} : {...content,status:'completed'};
};
const operationArgs=z.object({taskListId:z.string(),taskId:z.string().optional()});
const completedRef=z.object({taskListId:z.string(),taskId:z.string()});
const toolName=z.enum(['create_task','update_task','complete_task']);
export class TaskService {
  constructor(private adapter: TasksAdapter, private store: Store, private ctx: Context, private writeLists: string[] = [], private searchPageLimit = 10, private realWrites?:RealWrites) {}
  private async currentView(ref:string):Promise<{view:ProposalView;digest:string}> {
    this.store.expireProposals();
    const op=this.store.operation(this.ctx,ref);
    const tool=toolName.safeParse(op?.tool);
    if(!op || !tool.success) throw new AppError('APPROVAL_INVALID','提案不存在或不屬於此帳號連線。');
    // Decided proposals hold no content, so never parse their payload.
    if(op.state!=='pending') return {digest:op.digest,view:{operationRef:ref,digest:op.digest,tool:tool.data,payload:{},before:null,requestedAfter:null,state:op.state,stale:false}};
    const payload:unknown=JSON.parse(op.payload);
    const {taskListId,taskId}=operationArgs.parse(payload);
    const before=taskId ? await this.adapter.get(taskListId,taskId) : undefined;
    const snapshot=this.store.db.prepare('SELECT value FROM secrets WHERE id=?').get(`snapshot:${ref}`) as {value:string}|undefined;
    const stale=!snapshot || (JSON.parse(snapshot.value) as {digest:string}).digest!==hash(before ?? null);
    return {digest:op.digest,view:{operationRef:ref,digest:op.digest,tool:tool.data,payload,before:before ?? null,requestedAfter:requestedAfter(tool.data,payload,before),state:op.state,stale}};
  }
  // Server-read proposal for the local desk; model-supplied text never reaches it except as data.
  proposalView(ref:string) {return this.currentView(ref).then(({view})=>view);}
  async approveOperation(ref:string,digest:string) {
    const {view}=await this.currentView(ref);
    if(view.state!=='pending') throw new AppError('APPROVAL_INVALID','提案已處理。');
    if(view.stale) throw new AppError('STALE_TASK','任務已改變，請用新操作重新檢視與核准。');
    this.store.approveBound(this.ctx,ref,digest);
  }
  rejectOperation(ref:string,digest:string) {this.store.reject(this.ctx,ref,digest);}
  async call(name: ToolName, input: unknown, approval?:DemoApproval): Promise<Record<string,unknown>> {
    const parsed = schemas[name].safeParse(input);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR','輸入格式不正確，請檢查工具欄位與日期。');
    const args = parsed.data;
    if (this.adapter.mode!=='demo') this.store.expireProposals();
    if (name==='list_task_lists' || name==='list_tasks' || name==='search_tasks') {
      const a = args as {taskListId?:string;query?:string;pageSize?:number;cursor?:string;includeCompleted?:boolean};
      const {cursor,...params} = a;
      const binding = {name,...params};
      let state:CursorState = cursor ? this.store.readCursor(this.ctx,binding,cursor) : {seen:[]};
      const start=Date.now(); let pages=0; const items:unknown[]=[]; let interrupted=false;
      do {
        let timeout:ReturnType<typeof setTimeout>|undefined;
        let page;
        try {
          const request=name==='list_task_lists' ? this.adapter.lists(a.pageSize!,state.token) : this.adapter.tasks(a.taskListId!,a.pageSize ?? 100,a.includeCompleted ?? false,state.token);
          page=await Promise.race([request,new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new AppError('UPSTREAM_UNAVAILABLE','讀取時間預算已用完。',true)),Math.max(1,10_000-(Date.now()-start)));})]);
        } catch(error) {
          if(name!=='search_tasks' || !(error instanceof AppError) || !error.retryable) throw error;
          interrupted=true;break;
        } finally {if(timeout)clearTimeout(timeout);}
        pages++;
        const normalize = (s:string) => s.normalize('NFC').toLowerCase();
        items.push(...page.items.filter(t=>!a.query || normalize(`${t.title}\n${(t as Task).notes ?? ''}`).includes(normalize(a.query))));
        if (page.nextPageToken && (state.seen.includes(page.nextPageToken) || page.nextPageToken===state.token)) throw new AppError('PAGINATION_CYCLE','上游重複續頁，已停止搜尋。');
        state = {token:page.nextPageToken,seen:[...state.seen,...(state.token ? [state.token] : [])]};
      } while (name==='search_tasks' && state.token && pages<this.searchPageLimit && Date.now()-start<10_000);
      if (state.seen.length>1000) throw new AppError('PAGINATION_LIMIT','續頁鏈過長，請重新查詢。');
      return {mode:this.adapter.mode,items,complete:!state.token && !interrupted,scannedPages:pages,...(interrupted ? {interrupted:true} : {}),...(state.token || interrupted ? {nextCursor:this.store.cursor(this.ctx,binding,state)} : {})};
    }
    if (name==='get_task') { const a=args as {taskListId:string;taskId:string}; return {mode:this.adapter.mode,task:await this.adapter.get(a.taskListId,a.taskId)}; }
    const a=args as {taskListId:string;taskId?:string;expectedEtag?:string;idempotencyKey?:string;operationKey?:string;title?:string;notes?:string;taskDate?:string;changes?:Record<string,unknown>};
    // Real writes stay fail-closed unless the entrypoint wired the local approval desk.
    const real=this.adapter.mode!=='demo';
    if (real && !this.realWrites) throw new AppError('REAL_WRITES_DISABLED','目前版本尚未開放真實 Google 寫入。');
    if (!real && !this.writeLists.includes(a.taskListId)) throw new AppError('ACCESS_DENIED','此清單不允許測試寫入。');
    const op=this.store.proposal(this.ctx,name,(a.idempotencyKey ?? a.operationKey)!,args);
    // Direct mode has no reviewer, so task content never needs to rest in the ledger (D040).
    if (this.realWrites?.mode==='direct') this.store.redact(op.ref);
    if (op.state==='succeeded') {
      if(!real) return JSON.parse(op.result!) as Record<string,unknown>;
      // Replay reads Google rather than a local copy, so it shows the task as it is now.
      const done=completedRef.parse(JSON.parse(op.result!));
      return {mode:this.adapter.mode,task:await this.adapter.get(done.taskListId,done.taskId),operationRef:op.ref,replayed:true};
    }
    if (op.state==='expired') throw new AppError('OPERATION_FAILED','此提案已逾期且內容已清除；請用新的 key 重新提出。',false,{operationRef:op.ref});
    if (op.state==='uncertain') throw new AppError('WRITE_OUTCOME_UNKNOWN','先前寫入結果不明；禁止重送，請核對清單。',false,{operationRef:op.ref});
    if (op.state==='in_flight') throw new AppError('OPERATION_IN_PROGRESS','同一操作正在執行。',false,{operationRef:op.ref});
    if (op.state==='failed_definitive') throw new AppError('OPERATION_FAILED','此操作已遭拒絕，請檢查原錯誤。',false,{operationRef:op.ref});
    const before = a.taskId ? await this.adapter.get(a.taskListId,a.taskId) : undefined;
    if (before?.assignmentInfo) throw new AppError('ACCESS_DENIED','不支援修改指派任務。');
    const version=before ? requireTaskVersion(before.etag) : undefined;
    // The caller's version is what protects an edit made after the model last read the task.
    if (before && before.etag!==a.expectedEtag) throw new AppError('STALE_TASK','The task changed since you read it. Read it again, show the user what changed, and use a new key.');
    // Snapshot was recorded when first proposed; do not silently approve a changed task.
    const snapshotId=`snapshot:${op.ref}`;
    const old=this.store.db.prepare('SELECT value FROM secrets WHERE id=?').get(snapshotId) as {value:string}|undefined;
    if (!old) this.store.db.prepare('INSERT OR IGNORE INTO secrets VALUES(?,?)').run(snapshotId,JSON.stringify({digest:hash(before ?? null)}));
    else if ((JSON.parse(old.value) as {digest:string}).digest!==hash(before ?? null)) throw new AppError('STALE_TASK','任務已改變，請用新操作重新檢視與核准。');
    if (approval && !real) {
      if(approval.signal.aborted) throw new AppError('APPROVAL_CANCELLED','確認已取消，未執行寫入。');
      const controller=new AbortController();
      const signal=AbortSignal.any([approval.signal,controller.signal]);
      let timer:ReturnType<typeof setTimeout>|undefined;
      try {
        const expired=new Promise<never>((_,reject)=>{
          const stop=()=>reject(new AppError('APPROVAL_CANCELLED','確認已取消或逾時，未執行寫入。'));
          signal.addEventListener('abort',stop,{once:true});
          timer=setTimeout(()=>controller.abort(),60_000);
        });
        const accepted=await Promise.race([approval.request({operationRef:op.ref,digest:op.digest,tool:name,payload:JSON.parse(op.payload),before:before ?? null,requestedAfter:requestedAfter(name,args,before)},signal),expired]);
        if(signal.aborted || accepted!==true) throw new AppError('APPROVAL_CANCELLED','未取得明確核准，未執行寫入。');
        const current=a.taskId ? await this.adapter.get(a.taskListId,a.taskId) : undefined;
        if(hash(current ?? null)!==hash(before ?? null)) throw new AppError('STALE_TASK','確認期間任務已改變，請重新檢視與核准。');
        if(signal.aborted) throw new AppError('APPROVAL_CANCELLED','確認已取消或逾時，未執行寫入。');
        // No await between this bound approval and the atomic claim below.
        this.store.approveBound(this.ctx,op.ref,op.digest);
      } catch(error) {
        if(error instanceof AppError) throw error;
        throw new AppError('APPROVAL_UNAVAILABLE','無法取得可信確認，未執行寫入。');
      } finally {
        if(timer) clearTimeout(timer);
        controller.abort();
      }
    }
    if (this.realWrites?.mode==='direct') {
      // No await before the claim below; a concurrent call with this key loses here and never writes.
      try {this.store.approveBound(this.ctx,op.ref,op.digest);}
      catch {throw new AppError('OPERATION_IN_PROGRESS','同一操作正在執行。',false,{operationRef:op.ref});}
    }
    if (!this.store.claim(op.ref)) {
      if(this.realWrites?.mode==='local-approval') throw new AppError('APPROVAL_REQUIRED','尚未寫入。請使用者在這台電腦的瀏覽器開啟 approvalUrl，核對內容後按核准；之後以完全相同的參數與 key 重試。你不可自行開啟或操作此網址，也不可改用新的 key 繞過。',false,{operationRef:op.ref,approvalUrl:this.realWrites.approvalUrl(op.ref)});
      throw new AppError('APPROVAL_REQUIRED','請在本機終端檢視並核准此提案，再以相同參數重試。',false,{operationRef:op.ref,approvalCommand:`npm run demo -- approve ${op.ref}`});
    }
    if (real) this.store.redact(op.ref); // Arguments of this call carry the write from here.
    try {
      let task: Task;
      if (name==='create_task') {
        const {taskListId,title,notes,taskDate}=schemas.create_task.parse(args);
        task=await this.adapter.create(taskListId,{title,...(notes!==undefined ? {notes} : {}),...(taskDate!==undefined ? {taskDate} : {})});
      } else if (name==='update_task') {
        const {taskListId,taskId,changes}=schemas.update_task.parse(args);
        task=await this.adapter.patch(taskListId,taskId,changes,requireTaskVersion(version));
      } else {
        const {taskListId,taskId}=schemas.complete_task.parse(args);
        if (!before) throw new AppError('INTERNAL_ERROR','缺少核准前的任務狀態。');
        task=before.status==='completed' ? before : await this.adapter.patch(taskListId,taskId,{status:'completed'},requireTaskVersion(version));
      }
      const result={mode:this.adapter.mode,task,operationRef:op.ref}; this.store.finish(op.ref,'succeeded',real ? {taskListId:a.taskListId,taskId:task.id} : result); return result;
    } catch (error) {
      const definitive=(error instanceof GoogleHttpError && [400,401,403,404,409,412,422,429].includes(error.status)) || (error instanceof AppError && error.code==='STALE_TASK');
      try {this.store.finish(op.ref,definitive ? 'failed_definitive' : 'uncertain');} catch { /* durable in_flight is recovered as uncertain */ }
      if (definitive) throw error;
      throw new AppError('WRITE_OUTCOME_UNKNOWN','寫入結果無法確認；禁止自動重送。',false,{operationRef:op.ref});
    }
  }
}

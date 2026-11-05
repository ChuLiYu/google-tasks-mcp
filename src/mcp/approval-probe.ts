import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { inputRequired, type McpServer } from '@modelcontextprotocol/server';
import { AppError, safeError } from '../domain/index.js';

// Diagnostic only: accepting this form never grants permission for a Google write.
const pendingByOwner=new WeakMap<object,Map<string,number>>();
const accepted=z.object({action:z.literal('accept'),content:z.object({approved:z.literal(true)})});
const message='Google Tasks 核准介面測試：這次不會建立、修改、完成或刪除 Google 資料，也不會開啟寫入。請確認你實際看見本表單，再勾選並送出。拒絕、取消或逾時皆不算通過。';
const requestedSchema={type:'object' as const,properties:{approved:{type:'boolean' as const,title:'我確實看見這份測試表單'}},required:['approved']};

export function registerApprovalProbe(server:McpServer,owner:object,modern:boolean) {
  let pending=pendingByOwner.get(owner);
  if(!pending) {pending=new Map();pendingByOwner.set(owner,pending);}
  const continuations=pending;
  server.registerTool('check_approval_channel',{
    description:'測試真人核准表單是否可顯示並回傳；不讀寫 Google、不開啟寫入。工具成功只證明收到表單回覆，仍須使用者確認確實看見表單。',
    inputSchema:z.object({}).strict(),
    annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},
  },async(_args,ctx)=>{
    try {
      if(ctx.mcpReq.signal.aborted) throw new AppError('APPROVAL_CANCELLED','測試已取消。');
      let response:unknown;
      if(modern) {
        for(const [key,expires] of continuations) if(expires<=Date.now()) continuations.delete(key);
        const state=ctx.mcpReq.requestState<unknown>();
        if(state===undefined) {
          if(ctx.mcpReq.inputResponses) throw new AppError('APPROVAL_CANCELLED','缺少測試識別碼。');
          if(continuations.size>=128) throw new AppError('APPROVAL_UNAVAILABLE','待確認測試過多。');
          const nonce=randomBytes(32).toString('base64url');
          continuations.set(nonce,Date.now()+60_000);
          return inputRequired({requestState:nonce,inputRequests:{approval:inputRequired.elicit({mode:'form',message,requestedSchema})}});
        }
        if(typeof state!=='string') throw new AppError('APPROVAL_CANCELLED','測試識別碼無效。');
        const expires=continuations.get(state);
        continuations.delete(state);
        if(expires===undefined || expires<=Date.now()) throw new AppError('APPROVAL_CANCELLED','測試已失效，請重新開始。');
        response=ctx.mcpReq.inputResponses?.approval;
      } else {
        response=await ctx.mcpReq.elicitInput({mode:'form',message,requestedSchema},{signal:ctx.mcpReq.signal,timeout:60_000});
      }
      if(ctx.mcpReq.signal.aborted || !accepted.safeParse(response).success) throw new AppError('APPROVAL_CANCELLED','未收到明確勾選的表單回覆。');
      const result={formResponseAccepted:true,googleWritesEnabled:false,humanObservationRequired:true};
      return {content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:result};
    } catch(error) {
      const result=safeError(error instanceof AppError ? error : new AppError('APPROVAL_UNAVAILABLE','客戶端核准表單無法完成；Google 寫入仍關閉。'));
      return {isError:true,content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:result};
    }
  });
}

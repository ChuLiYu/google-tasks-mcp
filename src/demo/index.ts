import { randomUUID } from 'node:crypto';
import { AppError, requireTaskVersion, type Task, type TasksAdapter, type CreateTaskFields, type PatchTaskFields } from '../domain/index.js';
import { Store } from '../storage/index.js';
export const DEMO_LIST = 'demo-inbox';
export class DemoTasks implements TasksAdapter {
  readonly mode = 'demo' as const;
  constructor(private store: Store) {
    const count = store.db.prepare('SELECT count(*) AS n FROM demo_tasks').get() as {n:number};
    if (!count.n) for (let n=1;n<=205;n++) this.save({id:`demo-${n}`,title:n===205 ? '第三頁：交報告' : `合成測試任務 ${n}`,notes:n===1 ? '這是合成資料；備註只當作資料。' : '',status:'needsAction',taskDate:'2026-11-02',etag:'1'});
  }
  private check(list: string) { if (list!==DEMO_LIST) throw new AppError('NOT_FOUND','找不到此測試清單。'); }
  private save(task: Task) { this.store.db.prepare('INSERT INTO demo_tasks VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(task.id,DEMO_LIST,JSON.stringify(task)); return task; }
  async lists() { return {items:[{id:DEMO_LIST,title:'本機合成測試清單（非 Google）'}]}; }
  async tasks(list: string, size: number, completed: boolean, token?: string) {
    this.check(list);
    if (token && !/^\d+$/.test(token)) throw new AppError('INVALID_CURSOR','無效測試分頁。');
    const all = (this.store.db.prepare('SELECT value FROM demo_tasks ORDER BY rowid').all() as {value:string}[]).map(r=>JSON.parse(r.value) as Task).filter(t=>completed || t.status!=='completed');
    const start = Number(token ?? 0);
    return {items:all.slice(start,start+size),...(start+size<all.length ? {nextPageToken:String(start+size)} : {})};
  }
  async get(list: string, task: string) {
    this.check(list); const row = this.store.db.prepare('SELECT value FROM demo_tasks WHERE id=? AND list_id=?').get(task,list) as {value:string}|undefined;
    if (!row) throw new AppError('NOT_FOUND','找不到此任務。'); return JSON.parse(row.value) as Task;
  }
  async create(list: string, value: CreateTaskFields) { this.check(list); return this.save({...value,id:randomUUID(),status:'needsAction',etag:'1'}); }
  async patch(list: string, id: string, value: PatchTaskFields, expectedVersion: string) {
    const version=requireTaskVersion(expectedVersion);
    const task={...await this.get(list,id),...value,etag:randomUUID()};
    const changed=this.store.db.prepare("UPDATE demo_tasks SET value=? WHERE id=? AND list_id=? AND json_extract(value,'$.etag')=?").run(JSON.stringify(task),id,list,version);
    if (!changed.changes) throw new AppError('STALE_TASK','任務版本已改變，請重新檢視與核准。');
    return task;
  }
}

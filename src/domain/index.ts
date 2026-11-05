import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
export class AppError extends Error {
  constructor(public code: string, message: string, public retryable = false, public details: Record<string, unknown> = {}) { super(message); }
}
export function safeError(error: unknown) {
  const e = error instanceof AppError ? error : new AppError('INTERNAL_ERROR', '處理失敗，請查閱本機狀態。');
  return { code: e.code, message: e.message, retryable: e.retryable, requestId: randomUUID(), ...e.details };
}
export const id = z.string().min(1).max(512);
// A single concrete version only: never wildcard, weak validator, list or header injection.
export function requireTaskVersion(value: unknown): string {
  const parsed = z.string().min(1).max(1024).refine(s => !s.startsWith('W/') && !/[\s\x00-\x1f\x7f,*]/.test(s)).safeParse(value);
  if (!parsed.success) throw new AppError('WRITE_PRECONDITION_REQUIRED','缺少可用的任務版本，請重新讀取後再操作。');
  return parsed.data;
}
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => {
  const d = new Date(`${s}T00:00:00.000Z`);
  return s.slice(0, 4) !== '0000' && Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
}, '必須是存在的 YYYY-MM-DD 日期');
export const fields = {
  title: z.string().max(1024).refine(s => s.trim().length > 0, '標題不能空白'),
  notes: z.string().max(8192).optional(), taskDate: dateOnly.optional(),
};
export const changes = z.strictObject({ title: fields.title.optional(), notes: fields.notes, taskDate: fields.taskDate }).refine(o => Object.values(o).some(v => v !== undefined), '更新不能為空');
export const paging = { pageSize: z.number().int().min(1).max(100).default(100), cursor: z.string().max(4096).optional() };
export const schemas = {
  list_task_lists: z.strictObject(paging),
  list_tasks: z.strictObject({ taskListId: id, ...paging, includeCompleted: z.boolean().default(false) }),
  search_tasks: z.strictObject({ taskListId: id, query: z.string().min(1).max(512).refine(s => !!s.trim()), cursor: paging.cursor, includeCompleted: z.boolean().default(false) }),
  get_task: z.strictObject({ taskListId: id, taskId: id }),
  create_task: z.strictObject({ taskListId: id, ...fields, idempotencyKey: id }),
  update_task: z.strictObject({ taskListId: id, taskId: id, expectedEtag: id, changes, operationKey: id }),
  complete_task: z.strictObject({ taskListId: id, taskId: id, expectedEtag: id, operationKey: id }),
};
export type ToolName = keyof typeof schemas;
// 公開輸入 schema 為型別的唯一來源；adapter 僅接受可寫欄位。
export type CreateTaskFields = Pick<z.output<typeof schemas.create_task>, 'title' | 'notes' | 'taskDate'>;
export type PatchTaskFields = z.output<typeof changes> & { status?: 'completed' };
export type Task = { id: string; title: string; notes?: string; taskDate?: string; status: 'needsAction' | 'completed'; etag?: string; assignmentInfo?: unknown };
export type Page<T> = { items: T[]; nextPageToken?: string };
export type TaskList = { id: string; title: string };
export type Context = { principal: string; connection: string };
export interface TasksAdapter {
  readonly mode: 'demo' | 'google';
  lists(size: number, token?: string): Promise<Page<TaskList>>;
  tasks(list: string, size: number, completed: boolean, token?: string): Promise<Page<Task>>;
  get(list: string, task: string): Promise<Task>;
  create(list: string, fields: CreateTaskFields): Promise<Task>;
  patch(list: string, task: string, fields: PatchTaskFields, expectedVersion: string): Promise<Task>;
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export const scopeKey = (ctx: Context) => hash(ctx);
export function encodeFields(value: Record<string, unknown>) {
  const { taskDate, ...rest } = value;
  return { ...rest, ...(taskDate !== undefined ? { due: `${dateOnly.parse(taskDate)}T00:00:00.000Z` } : {}) };
}
export function timezoneHealth() {
  const offset = (zone: string) => new Intl.DateTimeFormat('en', { timeZone: zone, timeZoneName: 'longOffset' }).formatToParts(new Date('2026-11-02T07:30:00Z')).find(p => p.type === 'timeZoneName')?.value;
  const vancouver = offset('America/Vancouver'), taipei = offset('Asia/Taipei');
  return { node: process.version, icu: process.versions.icu, tz: process.versions.tz, vancouver, taipei, localDateInferenceSafe: vancouver === 'GMT-07:00' && taipei === 'GMT+08:00', dateOnlySupported: true };
}

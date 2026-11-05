import { describe,it,expect } from 'vitest';
import { dateOnly,schemas,encodeFields,timezoneHealth } from '../src/domain/index.js';
describe('strict domain',()=>{
  it.each(['2028-02-29','2026-11-02','2000-02-29'])('accept %s',s=>expect(dateOnly.parse(s)).toBe(s));
  it.each(['2026-02-29','2026-04-31','0000-01-01','1900-02-29','2026-11-02T03:00:00Z','明天',null])('reject %s',s=>expect(dateOnly.safeParse(s).success).toBe(false));
  it.each([{title:' '},{title:'x',reminder:'3pm'},{title:'x',taskDate:null},{title:'x',title2:'y'},{title:'x'.repeat(1025)}])('reject create %j',v=>expect(schemas.create_task.safeParse({taskListId:'l',idempotencyKey:'k',...v}).success).toBe(false));
  it('reject empty update and invalid pagination',()=>{
    expect(schemas.update_task.safeParse({taskListId:'l',taskId:'t',operationKey:'k',changes:{}}).success).toBe(false);
    for(const pageSize of [0,101,1.5]) expect(schemas.list_tasks.safeParse({taskListId:'l',pageSize}).success).toBe(false);
  });
  it('round trip encodes a pure date without local offset',()=>expect(encodeFields({taskDate:'2026-11-02',notes:''})).toEqual({due:'2026-11-02T00:00:00.000Z',notes:''}));
  it('timezone diagnostics refuses outdated Vancouver while date-only remains usable',()=>{
    const health=timezoneHealth();expect(health.taipei).toBe('GMT+08:00');expect(health.dateOnlySupported).toBe(true);
    expect(health.localDateInferenceSafe).toBe(health.vancouver==='GMT-07:00');
  });
  it('does not rewrite Vancouver history',()=>{
    const parts=(s:string)=>new Intl.DateTimeFormat('en',{timeZone:'America/Vancouver',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZoneName:'longOffset'}).format(new Date(s));
    expect(parts('2026-01-15T08:30:00Z')).toContain('00:30 GMT-08:00');
    expect(parts('2026-03-08T09:59:00Z')).toContain('01:59 GMT-08:00');
    expect(parts('2026-03-08T10:00:00Z')).toContain('03:00 GMT-07:00');
  });
});

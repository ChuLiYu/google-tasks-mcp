import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check,stamp } from './check-components.mjs';
const sections='\n## 職責與邊界\n\n測試元件。\n## 契約與不變條件\n\n測試契約。\n## 檔案與定位\n\n## 驗證\n\nnode --test\n## 修改決策紀錄\n';
function fixture(t) {
  const root=mkdtempSync(join(tmpdir(),'component-docs-'));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'src'));
  writeFileSync(join(root,'components.json'),JSON.stringify({version:1,components:[{id:'project',directory:'.',parent:null},{id:'src',directory:'src',parent:'project'}]}));
  writeFileSync(join(root,'SPEC.md'),'# 根規格\n\n[下層](src/SPEC.md)\n[登錄](components.json)\n'+sections);
  writeFileSync(join(root,'src/SPEC.md'),'# 子規格\n\n[上層](../SPEC.md)\n[程式](index.ts)\n'+sections);
  writeFileSync(join(root,'src/index.ts'),'export const value=1;\n');
  for(const id of ['project','src'])stamp(root,id,'建立合成文件測試基準與決策','fixture 自我驗證');
  assert.equal(check(root),2);return root;
}
test('程式變更必須同步文件及決策；stamp 後恢復通過',t=>{
  const root=fixture(t);writeFileSync(join(root,'src/index.ts'),'export const value=2;\n');
  assert.throws(()=>check(root),/src 文件未同步/);
  stamp(root,'src','調整測試數值並保留公開匯出契約','測試值已核對');assert.equal(check(root),2);
  assert.match(readFileSync(join(root,'src/SPEC.md'),'utf8'),/調整測試數值/);
});
test('新增與刪除檔案皆偵測；stamp 仍要求檔案定位',t=>{
  const root=fixture(t);writeFileSync(join(root,'src/new.ts'),'export {};');assert.throws(()=>check(root),/文件未同步/);
  stamp(root,'src','新增測試檔案但尚未補上定位連結','預期檢查失敗');assert.throws(()=>check(root),/缺少所屬檔案定位/);
  const spec=join(root,'src/SPEC.md');writeFileSync(spec,readFileSync(spec,'utf8').replace('## 檔案與定位','[新檔](new.ts)\n## 檔案與定位'));
  stamp(root,'src','新增檔案定位以支援精準閱讀流程','檔案定位完成');assert.equal(check(root),2);
  unlinkSync(join(root,'src/new.ts'));assert.throws(()=>check(root),/連結不存在|文件未同步/);
});
test('只改規格也必須追加決策及重新 stamp',t=>{
  const root=fixture(t),path=join(root,'src/SPEC.md');writeFileSync(path,readFileSync(path,'utf8').replace('測試契約。','修訂契約。'));
  assert.throws(()=>check(root),/src 文件未同步/);
  assert.throws(()=>stamp(root,'src','',''),/必須填入具體/);
});
test('上下層必須互相連結，重建指紋不可繞過',t=>{
  const root=fixture(t),path=join(root,'src/SPEC.md');writeFileSync(path,readFileSync(path,'utf8').replace('[上層](../SPEC.md)',''));
  stamp(root,'src','移除上層連結驗證強制規則確實運作','預期檢查失敗');assert.throws(()=>check(root),/缺少上下層連結/);
});
test('新增元件缺少規格與不合法父層皆拒絕',t=>{
  const root=fixture(t),path=join(root,'components.json'),data=JSON.parse(readFileSync(path,'utf8'));
  data.components.push({id:'child',directory:'src/child',parent:'src'});writeFileSync(path,JSON.stringify(data));assert.throws(()=>check(root),/ENOENT/);
  data.components.at(-1).parent='project';writeFileSync(path,JSON.stringify(data));assert.throws(()=>check(root),/上層必須是最近/);
});
test('未登錄子目錄仍由最近上層管理；不可偷偷新增未追蹤檔案',t=>{
  const root=fixture(t);mkdirSync(join(root,'src/helper'));writeFileSync(join(root,'src/helper/value.ts'),'export {};');assert.throws(()=>check(root),/src 文件未同步.*helper\/value.ts/);
});

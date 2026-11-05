import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadContext} from './context-model.mjs';
import {renderMap,syncMap,checkDependencies} from './check-context.mjs';
function fixture(run) {
  const root=mkdtempSync(join(tmpdir(),'tasks-ssot-'));
  const data={version:1,knowledge:{rules:{path:'RULES.md',purpose:'Synthetic requirements'}},components:[
    {id:'project',directory:'.',parent:null,knowledge:['rules']},
    {id:'src',directory:'src',parent:'project',knowledge:['rules'],allowedDependencies:['domain','service']},
    {id:'domain',directory:'src/domain',parent:'src',knowledge:['rules'],allowedDependencies:[]},
    {id:'service',directory:'src/service',parent:'src',knowledge:['rules'],allowedDependencies:['domain']}]};
  try {
    for(const c of data.components) {mkdirSync(join(root,c.directory),{recursive:true});writeFileSync(join(root,c.directory,'SPEC.md'),'Fixture');}
    mkdirSync(join(root,'docs'));writeFileSync(join(root,'RULES.md'),'Requirement fixture');
    writeFileSync(join(root,'components.json'),JSON.stringify(data));
    writeFileSync(join(root,'src/domain/index.ts'),'export const input = 1;');
    writeFileSync(join(root,'src/service/index.ts'),"import {input} from '../domain/index.js';");
    writeFileSync(join(root,'docs/INDEX.md'),'Keep manual text\n<!-- context-map:start -->\nstale\n<!-- context-map:end -->\nKeep footer\n');
    run(root,data);
  } finally {rmSync(root,{recursive:true,force:true});}
}
test('authority references, generated router and regeneration have one source',()=>fixture((root,data)=>{
  assert.equal(loadContext(root).components.length,4);
  assert.throws(()=>syncMap(root,data),/drift/);syncMap(root,data,true);syncMap(root,data);
  assert.match(readFileSync(join(root,'docs/INDEX.md'),'utf8'),/^Keep manual text/);
  assert.match(renderMap(data),/RULES.md/);
  writeFileSync(join(root,'RULES.md'),'Updated intent');syncMap(root,loadContext(root)); // Link router, never duplicate authority contents.
  data.knowledge.duplicate={...data.knowledge.rules};writeFileSync(join(root,'components.json'),JSON.stringify(data));
  assert.throws(()=>loadContext(root),/Duplicate authoritative/);
  symlinkSync(join(root,'RULES.md'),join(root,'alias.md'));data.knowledge.duplicate.path='alias.md';writeFileSync(join(root,'components.json'),JSON.stringify(data));
  assert.throws(()=>loadContext(root),/Duplicate authoritative/);delete data.knowledge.duplicate;
  data.components[2].knowledge=['unknown'];writeFileSync(join(root,'components.json'),JSON.stringify(data));
  assert.throws(()=>loadContext(root),/knowledge selection/);
  data.components[2].knowledge=['rules'];data.components[2].allowedDependencies=['unknown'];writeFileSync(join(root,'components.json'),JSON.stringify(data));
  assert.throws(()=>loadContext(root),/dependency policy/);data.components[2].allowedDependencies=[];
  data.knowledge.rules.path='MISSING.md';writeFileSync(join(root,'components.json'),JSON.stringify(data));
  assert.throws(()=>loadContext(root));
}));
test('dependency policy rejects forbidden static, export, type and dynamic imports',()=>fixture((root,data)=>{
  assert.equal(checkDependencies(root,data).imports,1);
  for(const statement of ["import '../service/index.js';","export * from '../service/index.js';","type X = import('../service/index.js');","import('../service/index.js');","const target = '../service/index.js'; import(target);", "import {createRequire as make} from 'node:module'; const load=make(import.meta.url); load('../service/index.js');"]) {
    writeFileSync(join(root,'src/domain/index.ts'),statement);
    assert.throws(()=>checkDependencies(root,data),/Forbidden dependency|Computed source imports|Runtime module loaders/);
  }
  writeFileSync(join(root,'src/domain/index.ts'),"import '../../../RULES.md';");assert.throws(()=>checkDependencies(root,data));
}));

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,copyFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('context only reads an allowed spec and rejects traversal, ignored data and escaping symlinks',()=>{
  const fixture=mkdtempSync(join(tmpdir(),'tasks-context-'));
  try {
    const root=join(fixture,'repo');mkdirSync(join(root,'scripts'),{recursive:true});
    copyFileSync(fileURLToPath(new URL('./component-context.mjs',import.meta.url)),join(root,'scripts/component-context.mjs'));
    copyFileSync(fileURLToPath(new URL('./context-model.mjs',import.meta.url)),join(root,'scripts/context-model.mjs'));
    writeFileSync(join(root,'SPEC.md'),'Root');writeFileSync(join(root,'RULES.md'),'Authority');
    mkdirSync(join(root,'module'));mkdirSync(join(root,'.data'));mkdirSync(join(root,'.env-secrets'));
    writeFileSync(join(root,'module/SPEC.md'),'# Module\n## 契約與不變條件\nAllowed context\n## 修改決策紀錄\nHidden history\n<!-- component-snapshot\n{}\n-->');
    writeFileSync(join(fixture,'SPEC.md'),'OUTSIDE_FIXTURE_MUST_NOT_PRINT');
    writeFileSync(join(root,'.data/SPEC.md'),'IGNORED_FIXTURE_MUST_NOT_PRINT');
    writeFileSync(join(root,'.env-secrets/SPEC.md'),'IGNORED_FIXTURE_MUST_NOT_PRINT');
    symlinkSync(fixture,join(root,'escape'));
    symlinkSync(join(root,'.data'),join(root,'ignored-link'));
    const run=(directory,args=['module'])=>{
      writeFileSync(join(root,'components.json'),JSON.stringify({version:1,knowledge:{rules:{path:'RULES.md',purpose:'Fixture intent'}},components:[{id:'project',directory:'.',parent:null,knowledge:['rules']},{id:'module',directory,parent:'project',knowledge:['rules']}]}));
      return spawnSync(process.execPath,[join(root,'scripts/component-context.mjs'),...args],{encoding:'utf8'});
    };
    const sources=run('module',['--sources']);assert.equal(sources.status,0);assert.match(sources.stdout,/rules: RULES.md/);assert.doesNotMatch(sources.stdout,/Allowed context/);
    const allowed=run('module');assert.equal(allowed.status,0);assert.match(allowed.stdout,/Allowed context/);
    assert.doesNotMatch(allowed.stdout,/Hidden history|component-snapshot/);
    for(const directory of ['..','../outside',fixture,'.data','.env-secrets','escape','ignored-link','module/../module','file:/tmp']) {
      const denied=run(directory);assert.notEqual(denied.status,0,directory);
      assert.doesNotMatch(denied.stdout,/OUTSIDE_FIXTURE|IGNORED_FIXTURE|Allowed context/);
    }
    for(const args of [[],['unknown'],['module','extra']]) assert.equal(run('module',args).status,1);
  } finally {rmSync(fixture,{recursive:true,force:true});}
});

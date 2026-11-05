import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {loadContext,sourcePath,specPath,componentOwner} from './context-model.mjs';
const begin='<!-- context-map:start -->',end='<!-- context-map:end -->';
export function renderMap(data) {
  const lines=['', '此區塊由 `components.json` 產生；請執行 `npm run context:generate`，不要手改。','',
    '| 知識 ID | 權威來源 | 範圍 |','|---|---|---|'];
  for(const [id,entry] of Object.entries(data.knowledge)) lines.push(`| ${id} | [${entry.path}](../${entry.path}) | ${entry.purpose.replaceAll('|','／')} |`);
  lines.push('','| 模組 | 定位規格 | 按需載入的知識 ID |','|---|---|---|');
  for(const c of data.components) lines.push(`| ${c.id} | [${specPath(c)}](../${specPath(c)}) | ${c.knowledge.join(', ')} |`);
  lines.push('','允許的跨元件來源相依（政策，非自動推測的實際相依圖）：','','```mermaid','flowchart TD');
  for(const c of data.components.filter(c=>c.allowedDependencies)) {
    lines.push(`    ${c.id}[${c.id}]`);
    for(const dep of c.allowedDependencies) lines.push(`    ${c.id} --> ${dep}`);
  }
  lines.push('```','');return lines.join('\n');
}
export function syncMap(root,data,write=false) {
  const path=sourcePath(root,'docs/INDEX.md'),text=readFileSync(path,'utf8');
  if(text.split(begin).length!==2 || text.split(end).length!==2 || text.indexOf(begin)>text.indexOf(end)) throw new Error('INDEX requires one ordered generated region');
  const expected=text.slice(0,text.indexOf(begin)+begin.length)+renderMap(data)+text.slice(text.indexOf(end));
  if(write) writeFileSync(path,expected);
  else if(text!==expected) throw new Error('Context map drift: run npm run context:generate');
}
export function checkDependencies(root,data) {
  const files=[];
  const walk=dir=>{
    for(const entry of readdirSync(sourcePath(root,dir),{withFileTypes:true})) {
      if(entry.isSymbolicLink()) throw new Error('Source symlinks are not allowed');
      const path=`${dir}/${entry.name}`;
      if(entry.isDirectory()) walk(path);else if(entry.name.endsWith('.ts')) files.push(path);
    }
  };
  walk('src');
  let imports=0;
  for(const path of files) {
    const from=componentOwner(path,data.components),file=ts.createSourceFile(path,readFileSync(sourcePath(root,path),'utf8'),ts.ScriptTarget.Latest,true);
    if(!from?.allowedDependencies) throw new Error(`Missing source dependency policy: ${path}`);
    const visit=node=>{
      let spec;
      if(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) spec=node.moduleSpecifier;
      else if(ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) spec=node.moduleReference.expression;
      else if(ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) spec=node.argument.literal;
      else if(ts.isCallExpression(node) && (node.expression.kind===ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text==='require'))) {
        spec=node.arguments[0];
        if(!spec || !ts.isStringLiteralLike(spec)) throw new Error(`Computed source imports are not supported: ${path}`);
      }
      if(spec && ts.isStringLiteralLike(spec)) {
        const value=spec.text;
        if(value==='node:module' || value==='module') throw new Error(`Runtime module loaders are not allowed in source: ${path}`);
        if(value.startsWith('/')) throw new Error(`Absolute source import: ${path}`);
        if(value.startsWith('.')) {
          const target=relative(root,resolve(dirname(resolve(root,path)),value.replace(/\.js$/,'.ts'))).split('\\').join('/');
          sourcePath(root,target); // Resolve before assigning ownership; reject traversal and secrets.
          const to=componentOwner(target,data.components);
          if(to.id!==from.id && !from.allowedDependencies.includes(to.id)) throw new Error(`Forbidden dependency: ${from.id} -> ${to.id} (${path})`);
          imports++;
        }
      }
      ts.forEachChild(node,visit);
    };
    visit(file);
  }
  return {files:files.length,imports};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const args=process.argv.slice(2);if(args.length && (args.length!==1 || args[0]!=='--write')) throw new Error('Only --write is accepted');
    const root=fileURLToPath(new URL('../',import.meta.url)),data=loadContext(root);
    syncMap(root,data,args[0]==='--write');
    console.log(JSON.stringify({contextSources:Object.keys(data.knowledge).length,...checkDependencies(root,data),generated:args[0]==='--write',semanticAccuracyProven:false}));
  } catch(error) {console.error(error.message);process.exitCode=1;}
}

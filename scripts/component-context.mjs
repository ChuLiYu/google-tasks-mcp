// Load the registry and one selected SPEC, never the contents of every source.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadContext,sourcePath,specPath} from './context-model.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
try {
  const data=loadContext(root),args=process.argv.slice(2);
  if(args.length===1 && args[0]==='--sources') {
    for(const [id,entry] of Object.entries(data.knowledge)) console.log(`${id}: ${entry.path}\n  ${entry.purpose}`);
  } else if(args.length!==1 || !data.components.some(c=>c.id===args[0])) {
    console.error(`Usage: npm run context -- <component|--sources>\nComponents: ${data.components.map(c=>c.id).join(', ')}`);
    process.exitCode=1;
  } else {
    const c=data.components.find(c=>c.id===args[0]),path=specPath(c);
    const text=readFileSync(sourcePath(root,path),'utf8').split('<!-- component-snapshot')[0].split('## 修改決策紀錄')[0].trim();
    const authorities=c.knowledge.map(id=>`${id}: ${data.knowledge[id].path}`).join('\n');
    console.log(`Component: ${c.id}\nSpec: ${path}\nParent: ${c.parent ?? '(root)'}\nChildren: ${data.components.filter(p=>p.parent===c.id).map(p=>p.id).join(', ') || '(none)'}\n\nAuthoritative sources (load only when needed):\n${authorities}\n\n${text}`);
  }
} catch(error) {console.error(error.message);process.exitCode=1;}

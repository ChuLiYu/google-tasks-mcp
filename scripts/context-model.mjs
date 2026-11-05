// Shared path policy for context discovery and CI. No recursive source loading here.
import {readFileSync,realpathSync} from 'node:fs';
import {resolve,relative,sep,posix} from 'node:path';
const forbidden=new Set(['.data','.host','.git','.aws','.agents','.codex','node_modules','dist','coverage']);
const ignored=name=>forbidden.has(name) || name.startsWith('.env') || /\.(sqlite.*|log)$/.test(name);
export function sourcePath(root,path) {
  if(typeof path!=='string' || !/^[.a-zA-Z0-9_/-]+$/.test(path) || path.startsWith('/') || path.split('/').some(p=>p==='..' || ignored(p)) || posix.normalize(path)!==path) throw new Error('Invalid context source path');
  const base=realpathSync(root),absolute=realpathSync(resolve(base,path)),within=relative(base,absolute);
  if(!within || within==='..' || within.startsWith(`..${sep}`) || within.split(sep).some(ignored)) throw new Error('Context source outside allowed root');
  return absolute;
}
export const specPath=c=>c.directory==='.'?'SPEC.md':`${c.directory}/SPEC.md`;
export function loadContext(root) {
  const data=JSON.parse(readFileSync(sourcePath(root,'components.json'),'utf8'));
  if(data.version!==1 || !Array.isArray(data.components) || !data.knowledge || typeof data.knowledge!=='object' || Array.isArray(data.knowledge)) throw new Error('Invalid context registry');
  const ids=new Set(),dirs=new Set();
  for(const c of data.components) {
    if(!c || typeof c.id!=='string' || !/^[a-z][a-z0-9-]*$/.test(c.id) || ids.has(c.id) || typeof c.directory!=='string' || dirs.has(c.directory)) throw new Error('Invalid or duplicate component');
    sourcePath(root,specPath(c));
    if(!Array.isArray(c.knowledge) || !c.knowledge.length || new Set(c.knowledge).size!==c.knowledge.length || c.knowledge.some(k=>typeof k!=='string' || !Object.hasOwn(data.knowledge,k))) throw new Error(`Invalid knowledge selection: ${c.id}`);
    ids.add(c.id);dirs.add(c.directory);
  }
  if(data.components.filter(c=>c.directory==='.' && c.parent===null).length!==1) throw new Error('Context requires one root');
  for(const c of data.components) {
    if(c.directory!=='.') {
      const parent=data.components.filter(p=>p.id!==c.id && (p.directory==='.' || c.directory.startsWith(`${p.directory}/`))).sort((a,b)=>b.directory.length-a.directory.length)[0];
      if(!parent || parent.id!==c.parent) throw new Error(`Invalid context parent: ${c.id}`);
    }
    if(c.directory==='src' || c.directory.startsWith('src/')) {
      if(!Array.isArray(c.allowedDependencies) || new Set(c.allowedDependencies).size!==c.allowedDependencies.length || c.allowedDependencies.some(id=>id===c.id || !ids.has(id))) throw new Error(`Invalid dependency policy: ${c.id}`);
    } else if(c.allowedDependencies!==undefined) throw new Error(`Dependency policy only applies to source: ${c.id}`);
  }
  const authorities=new Set();
  for(const [id,entry] of Object.entries(data.knowledge)) {
    if(!/^[a-z][a-z0-9-]*$/.test(id) || !entry || typeof entry.purpose!=='string' || !entry.purpose.trim()) throw new Error('Invalid authority entry');
    const path=sourcePath(root,entry.path);
    if(authorities.has(path)) throw new Error('Duplicate authoritative source path');
    authorities.add(path);
  }
  return data;
}
export function componentOwner(path,components) {
  return components.filter(c=>c.directory==='.' || path.startsWith(`${c.directory}/`)).sort((a,b)=>b.directory.length-a.directory.length)[0];
}

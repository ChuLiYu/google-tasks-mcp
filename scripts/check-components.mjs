import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const snapshotPattern = /\n?<!-- component-snapshot\n([\s\S]*?)\n-->\n?/g;
const ignored = new Set(['node_modules', 'dist', '.data', '.host', '.git', '.agents', '.codex', '.aws', 'coverage']);
const headings = ['職責與邊界', '契約與不變條件', '檔案與定位', '驗證', '修改決策紀錄'];
const digest = text => createHash('sha256').update(text).digest('hex');
const specPath = c => c.directory === '.' ? 'SPEC.md' : `${c.directory}/SPEC.md`;
const cleanSpec = text => text.replace(snapshotPattern, '').trimEnd() + '\n';
function walk(root, dir = '') {
  return readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap(entry => {
    if (ignored.has(entry.name) || entry.name.startsWith('.env') || /\.(sqlite.*|log)$/.test(entry.name)) return [];
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) throw new Error(`不允許受管檔案為 symlink：${path}`);
    return entry.isDirectory() ? walk(root, path) : [path];
  }).sort();
}
function registry(root) {
  const data = JSON.parse(readFileSync(resolve(root, 'components.json'), 'utf8'));
  if (data.version !== 1 || !Array.isArray(data.components)) throw new Error('components.json 格式錯誤');
  const ids = new Set(), dirs = new Set();
  for (const c of data.components) {
    if (!/^[a-z][a-z0-9-]*$/.test(c.id) || ids.has(c.id) || dirs.has(c.directory)) throw new Error('元件 id／目錄錯誤或重複');
    if (c.directory !== '.' && (!/^[.a-zA-Z0-9_/-]+$/.test(c.directory) || c.directory.startsWith('/') || c.directory.split('/').includes('..') || posix.normalize(c.directory) !== c.directory)) throw new Error('元件路徑不合法');
    ids.add(c.id); dirs.add(c.directory);
  }
  if (data.components.filter(c => c.directory === '.' && c.parent === null).length !== 1) throw new Error('必須有唯一根元件');
  for (const c of data.components.filter(c => c.directory !== '.')) {
    const ancestors = data.components.filter(p => p.id !== c.id && (p.directory === '.' || c.directory.startsWith(`${p.directory}/`))).sort((a,b) => b.directory.length-a.directory.length);
    if (ancestors[0]?.id !== c.parent) throw new Error(`${c.id} 上層必須是最近的元件`);
  }
  return data.components;
}
function owner(path, components) {
  return components.filter(c => c.directory === '.' || path.startsWith(`${c.directory}/`)).sort((a,b) => b.directory.length-a.directory.length)[0];
}
function snapshot(root, c, components) {
  const specs = new Set(components.map(specPath));
  const files = walk(root).filter(p => !specs.has(p) && owner(p, components).id === c.id);
  const result = Object.fromEntries(files.map(p => [p, digest(readFileSync(resolve(root, p)))]));
  result[specPath(c)] = digest(cleanSpec(readFileSync(resolve(root, specPath(c)), 'utf8')));
  return result;
}
function savedSnapshot(text) {
  const matches = [...text.matchAll(snapshotPattern)];
  if (matches.length !== 1) throw new Error('必須有唯一 component-snapshot，請先 docs:stamp');
  return JSON.parse(matches[0][1]);
}
function links(root, path) {
  const text = readFileSync(resolve(root, path), 'utf8');
  return [...text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].flatMap(m => {
    let target = m[1].replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) return [];
    target = decodeURIComponent(target);
    const absolute = resolve(root, dirname(path), target);
    if (!absolute.startsWith(resolve(root) + '/') || !existsSync(absolute)) throw new Error(`${path} 連結不存在或超出專案：${target}`);
    return [relative(root, absolute).split('\\').join('/')];
  });
}
export function check(root) {
  const components = registry(root), errors = [];
  const files = walk(root);
  for (const path of files.filter(p => p.endsWith('.md'))) {
    try { links(root, path); } catch (e) { errors.push(e.message); }
  }
  for (const c of components) {
    try {
      const path = specPath(c), text = readFileSync(resolve(root,path), 'utf8');
      for (const heading of headings) if (!text.includes(`## ${heading}\n`)) throw new Error(`${path} 缺少章節：${heading}`);
      const targets = links(root,path);
      for (const related of components.filter(p => p.id === c.parent || p.parent === c.id)) {
        if (!targets.includes(specPath(related))) throw new Error(`${path} 缺少上下層連結：${specPath(related)}`);
      }
      const actual = snapshot(root,c,components), saved = savedSnapshot(text);
      const changed = [...new Set([...Object.keys(actual), ...Object.keys(saved)])].filter(p => actual[p] !== saved[p]);
      if (changed.length) throw new Error(`${c.id} 文件未同步：${changed.join(', ')}。更新 SPEC.md 契約後執行 docs:stamp ${c.id} --decision "原因／取捨" --validation "驗證結果"`);
      for (const p of Object.keys(actual).filter(p => p !== path)) {
        if (!targets.includes(p)) throw new Error(`${path} 缺少所屬檔案定位連結：${p}`);
      }
    } catch (e) { errors.push(e.message); }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return components.length;
}
export function stamp(root, id, decision, validation) {
  if (typeof decision !== 'string' || decision.trim().length < 8 || typeof validation !== 'string' || validation.trim().length < 4) throw new Error('必須填入具體 decision（至少 8 字元）及 validation（至少 4 字元）');
  const components = registry(root), c = components.find(c => c.id === id);
  if (!c) throw new Error(`找不到元件：${id}`);
  const path = resolve(root,specPath(c));
  const text = cleanSpec(readFileSync(path,'utf8'));
  if (!text.includes('## 修改決策紀錄\n')) throw new Error('SPEC.md 缺少修改決策紀錄');
  const safe = s => s.trim().replaceAll('\n',' ').replaceAll('\r',' ');
  const entry = `\n### ${new Date().toISOString().slice(0,10)}\n\n- 決策／原因／取捨：${safe(decision)}\n- 驗證：${safe(validation)}\n`;
  writeFileSync(path,text + entry);
  const value = snapshot(root,c,components);
  writeFileSync(path,readFileSync(path,'utf8') + `\n<!-- component-snapshot\n${JSON.stringify(value,null,2)}\n-->\n`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(new URL('..',import.meta.url)));
  try {
    const args = process.argv.slice(2);
    if (args[0] === '--stamp') {
      if(args.length !== 6 || args[2] !== '--decision' || args[4] !== '--validation') throw new Error('用法：npm run docs:stamp -- <id> --decision "原因／取捨" --validation "驗證結果"');
      stamp(root,args[1],args[3],args[5]);console.log(`已更新 ${args[1]} 的決策及指紋；請執行 npm run docs:check。`);
    } else if(args.length) throw new Error('不支援的參數');
    else console.log(`元件文件檢查通過：${check(root)} 個元件，檔案指紋與上下層連結一致。`);
  } catch(e) {console.error(e.message);process.exitCode=1;}
}

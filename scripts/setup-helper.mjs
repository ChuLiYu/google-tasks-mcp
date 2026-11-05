#!/usr/bin/env node
// Runs inside the project image during setup, so the host needs no Node. Reads stdin only and never prints secrets.
import { readFileSync } from 'node:fs';
const [mode,value]=process.argv.slice(2);
const input=readFileSync(0,'utf8');
if(mode==='client') {
  // Accept what Google's console downloads; the file is never echoed.
  let parsed;
  try {parsed=JSON.parse(input);} catch {process.exit(1);}
  const client=parsed?.installed ?? parsed?.web;
  process.exit(typeof client?.client_id==='string' && client.client_id.length>0 ? 0 : 1);
}
if(mode==='desktop' && value) {
  // Add one server and keep everything else. Malformed input stops here, so setup never overwrites it.
  let config;
  try {config=input.trim() ? JSON.parse(input) : {};} catch {process.exit(1);} // A parse error would echo the file's text.
  const isObject=value=>typeof value==='object' && value!==null && !Array.isArray(value);
  if(!isObject(config) || (config.mcpServers!==undefined && !isObject(config.mcpServers))) process.exit(1);
  config.mcpServers={...config.mcpServers,'google-tasks':{command:'/bin/sh',args:[value]}};
  process.stdout.write(JSON.stringify(config,null,2)+'\n');
  process.exit(0);
}
process.exit(2);

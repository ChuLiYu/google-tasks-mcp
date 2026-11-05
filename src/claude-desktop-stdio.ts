import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dataPath } from './local/runtime.js';
import { bridge } from './mcp/stdio-bridge.js';

// Started inside the running service container, so no credential reaches client configuration.
try {
  const token=readFileSync(resolve(dataPath,'private-http.token'),'utf8').trim();
  await bridge(process.stdin,process.stdout,{url:'http://127.0.0.1:3002/mcp',token});
} catch {
  console.error('Claude Desktop bridge could not start. Check that the local service is running.');
  process.exitCode=1;
}

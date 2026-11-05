import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { googleLocal } from './local/google-local.js';
import { dataPath } from './local/runtime.js';
import { EncryptedVault } from './storage/index.js';
import { AppError,safeError } from './domain/index.js';
import { authorizedConditionalUpdateTest } from './local/crud-test.js';

// Run only after the owner explicitly authorizes the conditional-update batch.
// No arbitrary IDs, retry keys, model approvals or production MCP writes.
if(process.argv.length!==2) {
  console.error(JSON.stringify(safeError(new AppError('VALIDATION_ERROR','此固定測試不接受額外參數。'))));
  process.exit(1);
}
const runtime=googleLocal();
try {
  const vault=new EncryptedVault(runtime.store,readFileSync(resolve(dataPath,'vault.key')));
  const connectionSchema=z.object({id:z.string().min(1)});
  const expected=connectionSchema.parse(vault.get('local-google')).id;
  const assertConnection=()=>{
    if(connectionSchema.parse(vault.get('local-google')).id!==expected) throw new AppError('GOOGLE_REAUTH_REQUIRED','測試帳號連線已更換，停止測試。');
  };
  const token=async()=>{assertConnection();const access=await runtime.oauth.accessToken();assertConnection();return access;};
  const report=await authorizedConditionalUpdateTest(runtime.store,{principal:'local-os-owner',connection:expected},token,'conditional-validation-2026-11-04');
  console.log(JSON.stringify({mode:'google-conditional-test',...report}));
}catch(error){console.error(JSON.stringify(safeError(error)));process.exitCode=1;}
finally{runtime.store.close();}

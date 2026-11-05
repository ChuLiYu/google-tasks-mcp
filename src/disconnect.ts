import { disconnect } from './local/disconnect.js';
import { dataPath } from './local/runtime.js';

// Prints outcomes only; a token never reaches the output.
const result=await disconnect(dataPath);
if(!result.wasConnected) console.error('No Google connection was stored.');
else if(result.revoked) console.error('Google access revoked and local credentials removed.');
else {
  console.error('Local credentials removed, but Google did not confirm revocation.');
  console.error('Remove access yourself: https://myaccount.google.com/permissions');
  process.exitCode=3;
}

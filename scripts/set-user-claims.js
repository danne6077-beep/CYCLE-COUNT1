const crypto = require('node:crypto');
const [uid, role, storeId] = process.argv.slice(2);
if (!uid || !['admin', 'editor', 'viewer'].includes(role)) { console.error('Usage: node scripts/set-user-claims.js <firebase-uid> <admin|editor|viewer> [store-id]'); process.exit(2); }
async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID; const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  if (!projectId || !credentials.client_email || !credentials.private_key) throw new Error('Set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_JSON in your shell.');
  const now = Math.floor(Date.now() / 1000); const enc = value => Buffer.from(value).toString('base64url');
  const unsigned = `${enc(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${enc(JSON.stringify({ iss: credentials.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3500 }))}`;
  const assertion = `${unsigned}.${crypto.sign('RSA-SHA256', Buffer.from(unsigned), credentials.private_key).toString('base64url')}`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  if (!tokenResponse.ok) throw new Error('Could not obtain Google OAuth access. Check the service account permissions.');
  const { access_token: accessToken } = await tokenResponse.json(); const accountUrl = `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts`;
  const currentResponse = await fetch(`${accountUrl}:lookup`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ localId: [uid] }) });
  if (!currentResponse.ok) throw new Error('Could not read the Firebase account. Check UID and Identity Toolkit permissions.');
  const account = await currentResponse.json(); let existing = {}; try { existing = JSON.parse(account.customAttributes || '{}'); } catch {}
  const claims = { ...existing, role, storeId: storeId || existing.storeId || uid };
  const response = await fetch(`${accountUrl}:update`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify(claims) }) });
  if (!response.ok) throw new Error('Could not update custom claims. Check the Firebase project API and service account permissions.');
  console.log(`Updated role and storeId claims for Firebase UID ${uid}. They apply after the user refreshes their ID token.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

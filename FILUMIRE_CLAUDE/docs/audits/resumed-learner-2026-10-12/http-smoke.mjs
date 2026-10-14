import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const base = 'http://127.0.0.1:3187';
const out = 'docs/audits/resumed-learner-2026-10-12';
const env = { ...process.env, NODE_ENV: 'production', FILUMIRE_PERSISTENCE: 'memory', DATABASE_URL: 'postgresql://audit:audit@127.0.0.1:1/audit', FILUMIRE_AUTH_JWT_SECRET: 'local-http-audit-only-signing-secret-at-least-32', FILUMIRE_ACCOUNT_REGISTRATION: 'open', NEXT_TELEMETRY_DISABLED: '1' };
for (const key of Object.keys(env)) if (/DATABASE|POSTGRES|NEON|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE/.test(key) && key !== 'DATABASE_URL') delete env[key];
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'apps/learner', '-p', '3187', '-H', '127.0.0.1'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let serverLog = ''; server.stdout.on('data', data => serverLog += data); server.stderr.on('data', data => serverLog += data);
const results = [];
async function request(name, path, { body, cookie, method, expected = 200 } = {}) {
 const response = await fetch(base + path, { method: method ?? (body ? 'POST' : 'GET'), headers: { ...(body ? { 'content-type': 'application/json', origin: base } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
 const text = await response.text();
 assert.equal(response.status, expected, `${name}: ${text.slice(0, 400)}`);
 results.push({ name, status: response.status });
 return { response, text, data: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : undefined };
}
function cookieOf(response) { const value = response.headers.get('set-cookie')?.match(/filumire_auth_session=([^;]*)/)?.[1]; assert(value); return `filumire_auth_session=${value}`; }
try {
 for (let i = 0; ; i++) {
  try { const response = await fetch(base + '/login'); if (response.ok) break; } catch {}
  if (i > 90 || server.exitCode !== null) throw new Error('Local server did not become ready');
  await new Promise(resolve => setTimeout(resolve, 500));
 }
 for (const lang of ['en', 'fr']) {
  const page = await request(`learner sign-in ${lang}`, `/login?lang=${lang}`);
  assert(page.text.includes('<details class="forgot'));
  assert(!page.text.includes('Continue as test learner'), 'production must hide development access');
 }
 await request('anonymous tutoring denied', '/api/tutoring/conversation?language=en', { expected: 401 });
 const run = randomUUID().slice(0, 8), password = 'fictional-audit-password';
 const guardian = await request('fictional guardian registration', '/api/account/register', { body: { email: `audit-${run}@example.test`, password, displayName: 'Fictional Guardian', preferredLanguage: 'en', confirmsGuardian: true, acceptsNotice: true }, expected: 201 });
 const guardianCookie = cookieOf(guardian.response);
 const username = `audit.${run}`;
 await request('fictional learner creation', '/api/account/learners', { cookie: guardianCookie, body: { displayName: 'Fictional Learner', username, password, preferredLanguage: 'en', consentsToLearnerData: true }, expected: 201 });
 const login = await request('learner password sign-in', '/api/session/login', { body: { login: username, password } });
 const learnerCookie = cookieOf(login.response);
 await request('authenticated account', '/api/session/me', { cookie: learnerCookie });
 const learning = await request('real learning initialization', '/api/learning', { cookie: learnerCookie });
 assert(learning.data.decision && learning.data.learnerState);
 await request('authoritative subject overview', '/api/learning?overview=1', { cookie: learnerCookie });
 for (const language of ['en', 'fr']) {
  await request(`FILU metadata ${language}`, `/api/tutoring/conversation?language=${language}`, { cookie: learnerCookie });
  const reply = await request(`FILU question ${language}`, '/api/tutoring/conversation', { cookie: learnerCookie, body: { language, question: language === 'en' ? 'Explain this' : 'Explique-moi', requestId: randomUUID() } });
  assert.equal(reply.data.provider, 'curriculum'); assert(reply.data.messages.length);
 }
 const disclosure = 'My address is 88 Fictional Street';
 const safe = await request('FILU privacy protection', '/api/tutoring/conversation', { cookie: learnerCookie, body: { language: 'en', question: disclosure, requestId: randomUUID() } });
 assert(!safe.text.includes(disclosure));
 const cross = await fetch(base + '/api/tutoring/conversation', { method: 'POST', headers: { cookie: learnerCookie, 'content-type': 'application/json', origin: 'https://outside.invalid' }, body: JSON.stringify({ language: 'en', question: 'Explain this', requestId: randomUUID() }) });
 assert.equal(cross.status, 403); results.push({ name: 'cross-origin request rejected', status: cross.status });
 await request('server sign-out', '/api/session/logout', { cookie: learnerCookie, body: {} });
 await request('revoked cookie denied', '/api/session/me', { cookie: learnerCookie, expected: 401 });
 console.log(`PASS ${results.length} local production HTTP checks; fictional memory records only`);
} finally {
 server.kill();
 writeFileSync(`${out}/http-results.json`, JSON.stringify(results, null, 2));
 writeFileSync(`${out}/http-server.log`, serverLog);
}

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, '.vercel/audited-private-preview-source.json')));
const url = 'https://filumire-learner-cc6jrhb2p-tabicrentsil-6879s-projects.vercel.app';
const cli = 'C:/Users/tabi/AppData/Local/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/vc.js';
const checks = [];
for (const [label, route, expected, markers] of [
  ['login-en', '/login?lang=en', 200, ['Enter your details to continue.', 'password reset by email is not available', '<details']],
  ['login-fr-query', '/login?lang=fr', 200, ['<details']],
  ['session-anonymous', '/api/session/me', 401, []],
]) {
  const body = path.join(root, `.vercel/audited-private-preview-${label}.body`);
  const result = spawnSync(process.execPath, [cli, 'curl', route, '--deployment', url, '--', '--silent', '--show-error', '--max-time', '45', '--output', body, '--write-out', '%{http_code}'], { cwd: source.destination, encoding: 'utf8', timeout: 60000 });
  const status = Number(result.stdout?.trim());
  const content = fs.existsSync(body) ? fs.readFileSync(body, 'utf8') : '';
  const missing = markers.filter(marker => !content.includes(marker));
  checks.push({ label, route, expectedStatus: expected, status, missingMarkers: missing, passed: result.status === 0 && status === expected && !missing.length });
}
const protectionFile = path.join(root, '.vercel/audited-private-preview-protection-final.headers');
const unauth = spawnSync('curl.exe', ['--silent', '--show-error', '--max-time', '30', '--dump-header', protectionFile, '--output', path.join(root, '.vercel/audited-private-preview-protection-final.body'), '--write-out', '%{http_code}', `${url}/login`], { encoding: 'utf8', timeout: 40000 });
const status = Number(unauth.stdout?.trim());
const protectedRedirect = fs.existsSync(protectionFile) && /^Location: https:\/\/vercel\.com\/sso-api\?/im.test(fs.readFileSync(protectionFile, 'utf8'));
checks.push({ label: 'vercel-authentication', status, protectedRedirect, passed: unauth.status === 0 && status === 302 && protectedRedirect });
const report = { url, readOnlyRequests: true, databaseWrites: false, sourceHash: source.sourceHash, limitations: ['Language selection runs after browser hydration; HTTP checks verify availability, not French visual rendering.', 'Authenticated learning flows were not exercised to avoid database writes.'], checks };
fs.writeFileSync(path.join(root, '.vercel/audited-private-preview-http-checks.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = checks.every(check => check.passed) ? 0 : 1;

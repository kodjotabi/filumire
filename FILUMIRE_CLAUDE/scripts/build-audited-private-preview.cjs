const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..');
const report = JSON.parse(fs.readFileSync(path.join(root, '.vercel/audited-private-preview-source.json')));
for (const item of report.manifest) {
  for (const filename of [path.join(root, '..', item.file), path.join(report.destination, item.file)]) {
    if (createHash('sha256').update(fs.readFileSync(filename)).digest('hex') !== item.sha256) throw new Error(`Source changed: ${item.file}`);
  }
}
const env = { ...process.env, FILUMIRE_PERSISTENCE: 'memory', DATABASE_URL: 'postgresql://audit:audit@127.0.0.1:1/audit', FILUMIRE_AUTH_JWT_SECRET: 'local-audit-only-signing-secret-at-least-32-characters', FILUMIRE_ACCOUNT_REGISTRATION: 'open', NEXT_TELEMETRY_DISABLED: '1' };
for (const key of Object.keys(env)) if (/DATABASE|POSTGRES|NEON|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE/.test(key) && key !== 'DATABASE_URL') delete env[key];
const result = spawnSync('C:/Users/tabi/AppData/Local/npm-cache/_npx/52027bd8fc0022aa/node_modules/node/bin/node.exe', [path.join(root, 'node_modules/next/dist/bin/next'), 'build', path.join(report.destination, 'FILUMIRE_CLAUDE/apps/learner')], { cwd: path.join(report.destination, 'FILUMIRE_CLAUDE'), env, encoding: 'utf8', timeout: 240000, maxBuffer: 8 * 1024 * 1024 });
fs.writeFileSync(path.join(root, '.vercel/audited-private-preview-build.log'), `${result.stdout || ''}${result.stderr || ''}`);
console.log(JSON.stringify({ exitCode: result.status, error: result.error?.message, sourceHash: report.sourceHash }));
process.exitCode = result.status === 0 ? 0 : 1;

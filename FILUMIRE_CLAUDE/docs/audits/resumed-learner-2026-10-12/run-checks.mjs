import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const out = resolve('docs/audits/resumed-learner-2026-10-12');
const previous = JSON.parse(readFileSync('docs/audits/test-corrections-2026-10-12T05-43-02-194Z/test-results.json', 'utf8'));
const blocked = new Set(previous.blocked.map(item => item.file));
const env = { ...process.env, FILUMIRE_PERSISTENCE: 'memory', DATABASE_URL: 'postgresql://audit:audit@127.0.0.1:1/audit', FILUMIRE_AUTH_JWT_SECRET: 'local-audit-only-signing-secret-at-least-32-characters', FILUMIRE_ACCOUNT_REGISTRATION: 'open', NEXT_TELEMETRY_DISABLED: '1' };
for (const key of Object.keys(env)) if (/DATABASE|POSTGRES|NEON|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE/.test(key) && key !== 'DATABASE_URL') delete env[key];
const requested = new Set(process.argv.slice(2));
const label = requested.size ? 'focused-regression' : 'regression';
const files = readdirSync('tests').filter(file => /\.test\.(ts|mjs)$/.test(file) && !blocked.has(file) && (!requested.size || requested.has(file))).sort();
const results = []; let log = '';
for (const file of files) {
 const result = spawnSync(process.execPath, ['--import', 'tsx', `tests/${file}`], { env, encoding: 'utf8', timeout: 90000, maxBuffer: 8 * 1024 * 1024 });
 results.push({ file, exitCode: result.status, error: result.error?.message });
 log += `\n=== ${file}: ${result.status} ===\n${result.stdout ?? ''}${result.stderr ?? ''}`;
 console.log(`${result.status === 0 ? 'PASS' : 'FAIL'} ${file}`);
}
writeFileSync(`${out}/${label}.log`, log);
writeFileSync(`${out}/${label}-results.json`, JSON.stringify({ passed: results.filter(r => r.exitCode === 0).length, failed: results.filter(r => r.exitCode !== 0), blocked: previous.blocked, results }, null, 2));
if (results.some(result => result.exitCode !== 0)) process.exitCode = 1;
for (const [name, args] of (requested.size ? [] : [['root-types', ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false', '-p', 'tsconfig.json']], ['learner-types', ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false', '-p', 'apps/learner/tsconfig.json']], ['build', ['node_modules/next/dist/bin/next', 'build', 'apps/learner']]])) {
 const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 240000, maxBuffer: 8 * 1024 * 1024 });
 writeFileSync(`${out}/${name}.log`, `${result.stdout ?? ''}${result.stderr ?? ''}`);
 console.log(`${name}: ${result.status} ${result.error?.message ?? ''}`);
 if (result.status !== 0) process.exitCode = 1;
}

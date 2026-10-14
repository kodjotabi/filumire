import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const out = 'docs/audits/audit2-stages0-2-2026-10-13';
const blocked = JSON.parse(readFileSync('docs/audits/resumed-learner-2026-10-12/regression-results.json', 'utf8')).blocked;
const excluded = new Set(blocked.map(x => x.file));
const env = { ...process.env, FILUMIRE_PERSISTENCE: 'memory', DATABASE_URL: 'postgresql://audit:audit@127.0.0.1:1/audit', FILUMIRE_AUTH_JWT_SECRET: 'local-audit2-only-signing-secret-at-least-32-characters', FILUMIRE_ACCOUNT_REGISTRATION: 'open', NEXT_TELEMETRY_DISABLED: '1' };
for (const key of Object.keys(env)) if (/DATABASE|POSTGRES|NEON|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE/.test(key) && key !== 'DATABASE_URL') delete env[key];
const chosen = process.argv.slice(2);
const results = [];
let log = '';
for (const file of readdirSync('tests').filter(f => /\.test\.(ts|mjs)$/.test(f) && !excluded.has(f) && (!chosen.length || chosen.includes(f))).sort()) {
 const r = spawnSync(process.execPath, ['--import', 'tsx', `tests/${file}`], { env, encoding: 'utf8', timeout: 90000, maxBuffer: 8*1024*1024 });
 results.push({ file, exitCode: r.status, error: r.error?.message });
 log += `\n=== ${file}: ${r.status} ===\n${r.stdout ?? ''}${r.stderr ?? ''}`;
 console.log(`${r.status === 0 ? 'PASS' : 'FAIL'} ${file}`);
}
const label = chosen.length ? 'focused' : 'regression';
writeFileSync(`${out}/${label}.log`, log);
writeFileSync(`${out}/${label}-results.json`, JSON.stringify({ passed: results.filter(r=>r.exitCode === 0).length, failed: results.filter(r=>r.exitCode !== 0), blocked, results }, null, 2));
if (results.some(r=>r.exitCode !== 0)) process.exitCode = 1;
for (const [name,args] of (chosen.length ? [] : [['root-types',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false','-p','tsconfig.json']],['learner-types',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false','-p','apps/learner/tsconfig.json']],['build',['node_modules/next/dist/bin/next','build','apps/learner']]])) {
 const r = spawnSync(process.execPath,args,{env,encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
 writeFileSync(`${out}/${name}.log`,`${r.stdout ?? ''}${r.stderr ?? ''}`);
 console.log(`${name}: ${r.status} ${r.error?.message ?? ''}`);
 if(r.status!==0) process.exitCode=1;
}

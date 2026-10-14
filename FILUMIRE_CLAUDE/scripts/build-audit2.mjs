import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const out = 'docs/audits/audit2-stages0-2-2026-10-13';
const env = { ...process.env, FILUMIRE_PERSISTENCE: 'memory', DATABASE_URL: 'postgresql://audit:audit@127.0.0.1:1/audit', FILUMIRE_AUTH_JWT_SECRET: 'local-audit2-only-signing-secret-at-least-32-characters', FILUMIRE_ACCOUNT_REGISTRATION: 'open', NEXT_TELEMETRY_DISABLED: '1' };
for (const key of Object.keys(env)) if (/DATABASE|POSTGRES|NEON|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE/.test(key) && key !== 'DATABASE_URL') delete env[key];
const node22 = 'C:/Users/tabi/AppData/Local/npm-cache/_npx/52027bd8fc0022aa/node_modules/node/bin/node.exe';
for (const [name,args] of [['root-types',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false','-p','tsconfig.json']],['learner-types',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false','-p','apps/learner/tsconfig.json']],['build',['node_modules/next/dist/bin/next','build','apps/learner']]]) {
 const r = spawnSync(node22,args,{env,encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
 writeFileSync(`${out}/${name}.log`,`${r.stdout ?? ''}${r.stderr ?? ''}`);
 console.log(`${name}: ${r.status} ${r.error?.message ?? ''}`);
 if(r.status!==0) process.exitCode=1;
}

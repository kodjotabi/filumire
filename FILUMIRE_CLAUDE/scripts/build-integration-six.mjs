import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const out='.vercel/integration-six-2026-10-13';
const env={...process.env,FILUMIRE_PERSISTENCE:'memory',DATABASE_URL:'postgresql://audit:audit@127.0.0.1:1/audit',FILUMIRE_AUTH_JWT_SECRET:'isolated-integration-build-secret-at-least-32',FILUMIRE_ACCOUNT_REGISTRATION:'open',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_FILUMIRE_LEARNER_APP_URL:'http://127.0.0.1:3201',NEXT_PUBLIC_FILUMIRE_LEARNER_PUBLIC_APPROVED:'true',NEXT_PUBLIC_FILUMIRE_PUBLIC_SITE_URL:'http://127.0.0.1:3200'};
for(const key of Object.keys(env))if(/DATABASE|POSTGRES|NEON|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE/.test(key)&&key!=='DATABASE_URL')delete env[key];
const node22='C:/Users/tabi/AppData/Local/npm-cache/_npx/52027bd8fc0022aa/node_modules/node/bin/node.exe';
const website='C:/Users/tabi/Desktop/filumire/FILUMIRE_WEBSITE';
for(const [name,args,cwd] of [
 ['root-types',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false'],process.cwd()],
 ['learner-types',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false','-p','apps/learner/tsconfig.json'],process.cwd()],
 ['website-types',['node_modules/typescript/bin/tsc','--noEmit','--incremental','false'],website],
 ['learner-build',['node_modules/next/dist/bin/next','build','apps/learner'],process.cwd()],
 ['website-build',['node_modules/next/dist/bin/next','build'],website],
 ]) {
 if(process.argv.includes('--website-only')&&!name.startsWith('website'))continue;
 const runtime=name.startsWith('website')?process.execPath:node22;
 const r=spawnSync(runtime,args,{cwd,env,encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});writeFileSync(`${out}/${name}.log`,(r.stdout??'')+(r.stderr??'')+(r.error?.message??''));console.log(`${name}: ${r.status} ${r.error?.message??''}`);if(r.status!==0){process.exitCode=1;break;}
}

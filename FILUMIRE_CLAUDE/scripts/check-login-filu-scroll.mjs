import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const out = '.vercel/login-filu-audit/scroll';
mkdirSync(out, { recursive: true });
const original = 'apps/learner/components/filumire/FiluConversation.tsx';
if (!process.argv.includes('--fixed')) writeFileSync(`${out}/FiluConversation-before.tsx.txt`, readFileSync(original), { flag: 'wx' });
const env = { ...process.env, NODE_ENV: 'production', FILUMIRE_PERSISTENCE: 'memory', DATABASE_URL: 'postgresql://audit:audit@127.0.0.1:1/audit', FILUMIRE_AUTH_JWT_SECRET: 'local-display-test-only-signing-secret-at-least-32', FILUMIRE_ACCOUNT_REGISTRATION: 'open', NEXT_TELEMETRY_DISABLED: '1' };
for (const key of Object.keys(env)) if (/DATABASE|POSTGRES|NEON|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE/.test(key) && key !== 'DATABASE_URL') delete env[key];
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','apps/learner','-p','3190','-H','127.0.0.1'], { env, stdio: ['ignore','pipe','pipe'] });
let log = ''; server.stdout.on('data',d=>log+=d); server.stderr.on('data',d=>log+=d);
try {
 let ready=false; for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:3190/login')).ok){ready=true;break;}}catch{} await new Promise(r=>setTimeout(r,500));}
 if(!ready)throw new Error('Server unavailable');
 const r=spawnSync(process.execPath,['tests/login-filu-scroll.browser.mjs',...process.argv.slice(2)],{env,encoding:'utf8',timeout:300000,maxBuffer:8*1024*1024});
 writeFileSync(`${out}/${process.argv.includes('--fixed')?'fixed':'reproduction'}.log`,`${r.stdout??''}${r.stderr??''}`); console.log(`${r.stdout??''}${r.stderr??''}`); process.exitCode=r.status??1;
}finally{server.kill();writeFileSync(`${out}/server.log`,log);}

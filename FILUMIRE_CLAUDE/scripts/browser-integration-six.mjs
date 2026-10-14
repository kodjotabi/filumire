import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const out='.vercel/integration-six-2026-10-13';
const env={...process.env,FILUMIRE_PERSISTENCE:'memory',DATABASE_URL:'postgresql://audit:audit@127.0.0.1:1/audit',FILUMIRE_AUTH_JWT_SECRET:'isolated-integration-test-key-at-least-32',FILUMIRE_ACCOUNT_REGISTRATION:'open',NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_FILUMIRE_LEARNER_APP_URL:'http://127.0.0.1:3201',NEXT_PUBLIC_FILUMIRE_LEARNER_PUBLIC_APPROVED:'true',NEXT_PUBLIC_FILUMIRE_PUBLIC_SITE_URL:'http://127.0.0.1:3200'};
for(const key of Object.keys(env))if(/DATABASE|POSTGRES|NEON|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE/.test(key)&&key!=='DATABASE_URL')delete env[key];
const servers=[spawn(process.execPath,['--require','./scripts/isolated-next-runtime.cjs','--import','tsx','scripts/serve-integration-six.ts'],{env,stdio:['ignore','pipe','pipe']}),spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3200'],{cwd:'C:/Users/tabi/Desktop/filumire/FILUMIRE_WEBSITE',env,stdio:['ignore','pipe','pipe']})];
let log='';for(const server of servers){server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);}
try{
 for(const port of [3200,3201]){let ready=false;for(let attempt=0;attempt<100;attempt++){try{if((await fetch(`http://127.0.0.1:${port}/login`)).status<500){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,300));}if(!ready)throw Error(`Server ${port} unavailable: ${log}`);}
 const test=spawn(process.execPath,['tests/integration-six.browser.mjs'],{env,stdio:['ignore','pipe','pipe']});let output='';test.stdout.on('data',d=>{output+=d;process.stdout.write(d)});test.stderr.on('data',d=>{output+=d;process.stderr.write(d)});const status=await new Promise(resolve=>test.on('exit',resolve));writeFileSync(out+'/browser.log',output);process.exitCode=status??1;
}finally{for(const server of servers)server.kill();writeFileSync(out+'/browser-server.log',log);}

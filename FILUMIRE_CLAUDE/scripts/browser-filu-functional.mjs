import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
// Starts the isolated memory-only launcher, then runs tests/filu-functional.browser.mjs against it. Needs a learner production build.
const out='.vercel/filu-functional';mkdirSync(out,{recursive:true});
const env={...process.env,FILUMIRE_PERSISTENCE:'memory',DATABASE_URL:'postgresql://audit:audit@127.0.0.1:1/audit',FILUMIRE_AUTH_JWT_SECRET:'isolated-filu-functional-signing-key-at-least-32',FILUMIRE_ACCOUNT_REGISTRATION:'open',NEXT_TELEMETRY_DISABLED:'1',
 FILUMIRE_TEST_FIXTURES:resolve(out,'fixtures.json'),FILUMIRE_NAVIGATION_ARTIFACTS:process.env.FILUMIRE_NAVIGATION_ARTIFACTS??resolve(out,'artifacts'),
 FILUMIRE_PLAYWRIGHT_MODULE:process.env.FILUMIRE_PLAYWRIGHT_MODULE??'file:///C:/Users/tabi/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs',
 FILUMIRE_CHROMIUM_PATH:process.env.FILUMIRE_CHROMIUM_PATH??'C:/Users/tabi/AppData/Local/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-win64/chrome-headless-shell.exe'};
for(const key of Object.keys(env))if(/DATABASE|POSTGRES|NEON|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE/.test(key)&&key!=='DATABASE_URL')delete env[key];
delete env.VERCEL;
const server=spawn(process.execPath,['--require','./scripts/isolated-next-runtime.cjs','--import','tsx','scripts/serve-filu-functional.mjs'],{env,stdio:['ignore','pipe','pipe']});let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
try{
 let ready=false;for(let i=0;i<200&&server.exitCode===null;i++){if(log.includes('READY:')){ready=true;break;}await new Promise(r=>setTimeout(r,300));}if(!ready)throw Error('FILU functional server unavailable: '+log);
 const child=spawn(process.execPath,['tests/filu-functional.browser.mjs'],{env,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',d=>{output+=d;process.stdout.write(d)});child.stderr.on('data',d=>{output+=d;process.stderr.write(d)});const status=await new Promise(resolve=>child.on('exit',resolve));writeFileSync(out+'/browser.log',output);process.exitCode=status??1;
}finally{server.kill();writeFileSync(out+'/server.log',log);}

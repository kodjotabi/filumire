// Runs tests/ask-filu-lesson-input.browser.mjs against an isolated memory server
// (production build, loopback only). Needs a learner build. Output: .vercel/ask-filu-lesson/.
// Default: reviewer mode, a role-less (all-roles) reviewer who linked their own learner as teacher,
// the same account state as the B8 Production test. --plain runs an ordinary guardian.
import {spawn,spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
const out='.vercel/ask-filu-lesson',port='3197';mkdirSync(out,{recursive:true});
const env={...process.env,FILUMIRE_PERSISTENCE:'memory',DATABASE_URL:'postgresql://audit:audit@127.0.0.1:1/audit',FILUMIRE_AUTH_JWT_SECRET:'isolated-ask-filu-lesson-signing-key-at-least-32',FILUMIRE_ACCOUNT_REGISTRATION:'open',NEXT_TELEMETRY_DISABLED:'1',ASK_FILU_TEST_PORT:port};
for(const key of Object.keys(env))if(/DATABASE|POSTGRES|NEON|PGHOST|PGPORT|PGUSER|PGPASSWORD|PGDATABASE|REVIEWER|ACCESS_MODE/.test(key)&&key!=='DATABASE_URL')delete env[key];
if(!process.argv.includes('--plain'))Object.assign(env,{FILUMIRE_ACCESS_MODE:'reviewers',ASK_FILU_TEST_EMAIL:'all-roles.reviewer@example.test',FILUMIRE_REVIEWER_EMAILS:'all-roles.reviewer@example.test,second.reviewer@example.test:guardian',FILUMIRE_REVIEWER_ACCESS_UNTIL:new Date(Date.now()+30*864e5).toISOString().slice(0,10),ASK_FILU_TEST_SELF_TEACHER:'1'});
const server=spawn(process.execPath,['--require','./scripts/isolated-next-runtime.cjs','--import','tsx','scripts/serve-ask-filu-lesson-test.ts'],{env,stdio:['ignore','pipe','pipe']});let log='';server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
try{let ready=false;for(let i=0;i<120;i++){if(log.includes('test server ready')){ready=true;break}if(server.exitCode!==null)break;await new Promise(r=>setTimeout(r,500))}
 if(!ready)throw Error('Isolated server unavailable: '+log);
 const result=spawnSync(process.execPath,['tests/ask-filu-lesson-input.browser.mjs'],{env,encoding:'utf8',timeout:400000});
 writeFileSync(out+'/browser.log',(result.stdout??'')+(result.stderr??''));console.log((result.stdout??'')+(result.stderr??''));process.exitCode=result.status??1;
}finally{server.kill();writeFileSync(out+'/server.log',log)}

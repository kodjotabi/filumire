import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),website='C:/Users/tabi/Desktop/filumire/FILUMIRE_WEBSITE';
for(const file of [path.join(root,'apps/learner/public/filumire-f.svg'),path.join(website,'public/brand/filumire-f.svg')])fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('85 65 165 200','85 35 185 230'));
const constants=path.join(website,'src/lib/constants.ts');
let source=fs.readFileSync(constants,'utf8');
source=source.replace('import { approvedPortalUrl } from "./destinations";','import { learnerDestination } from "./learner-navigation";');
source=source.replace(/learner: approvedPortalUrl\([^\n]+/, 'learner: learnerDestination("start", "en"),');
source=source.replace(/parent: approvedPortalUrl\([^\n]+/, 'parent: learnerDestination("parent", "en"),');
source=source.replace(/teacher: approvedPortalUrl\([^\n]+/, 'teacher: learnerDestination("teacher", "en"),');
fs.writeFileSync(constants,source);
fs.writeFileSync(path.join(website,'tests/integration-six.test.mjs'),`import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadTs} from './load-ts.mjs';
const {learnerDestination}=await import(await loadTs(new URL('../src/lib/learner-navigation.ts',import.meta.url)));
test('educational routes share the learner authority and preserve EN/FR',()=>{
 const saved={...process.env};
 try {
 process.env.NEXT_PUBLIC_FILUMIRE_LEARNER_APP_URL='https://protected-preview.vercel.app/old?old=1';
 process.env.NEXT_PUBLIC_FILUMIRE_LEARNER_PUBLIC_APPROVED='true';
 for(const language of ['en','fr'])for(const [entry,path] of [['start','/'],['login','/login'],['parent','/login'],['register','/register'],['teacher','/teacher']]){
 const url=new URL(learnerDestination(entry,language));assert.equal(url.pathname,path);assert.equal(url.searchParams.get('lang'),language);assert(!url.searchParams.has('old'));assert.equal(url.searchParams.get('returnTo'),entry==='parent'?'family':null);
 }
 process.env.NEXT_PUBLIC_FILUMIRE_LEARNER_PUBLIC_APPROVED='false';assert.equal(learnerDestination('parent','fr'),null);
 process.env.NEXT_PUBLIC_FILUMIRE_LEARNER_PUBLIC_APPROVED='true';process.env.NEXT_PUBLIC_FILUMIRE_LEARNER_APP_URL='javascript:alert(1)';assert.equal(learnerDestination('login','en'),null);
 }finally{for(const key of ['NEXT_PUBLIC_FILUMIRE_LEARNER_APP_URL','NEXT_PUBLIC_FILUMIRE_LEARNER_PUBLIC_APPROVED']){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
});
test('public account entry cannot manufacture billing access or separate educational identities',async()=>{
 const source=await readFile(new URL('../src/components/subscriptions/ParentAccount.tsx',import.meta.url),'utf8');
 assert(source.includes("learnerDestination('parent',locale)"));assert(source.includes('not operational'));
 assert(!source.includes('fetch('));assert(!source.includes('send-sign-in'));assert(!source.includes('activateTrial'));
 const legacy=await readFile(new URL('../src/components/subscriptions/LegacyParentAccount.tsx',import.meta.url),'utf8');assert(legacy.includes('export function LegacyParentAccount'));
});
`);
console.log('Unified role destinations, uncropped approved mark, and website integration regressions prepared.');

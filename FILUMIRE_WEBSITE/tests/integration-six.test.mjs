import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadTs} from './load-ts.mjs';
const {learnerDestination}=await import(await loadTs(new URL('../src/lib/learner-navigation.ts',import.meta.url)));
test('educational routes share the learner authority and preserve EN/FR',()=>{
 const saved={...process.env};
 try {
 process.env.NEXT_PUBLIC_FILUMIRE_LEARNER_APP_URL='https://learn.filumire.com/old?old=1';
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

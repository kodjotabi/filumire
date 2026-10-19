import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTs} from './load-ts.mjs';
const {learnerDestination}=await import(await loadTs(new URL('../src/lib/learner-navigation.ts',import.meta.url)));
const keys=['NEXT_PUBLIC_FILUMIRE_LEARNER_APP_URL','NEXT_PUBLIC_FILUMIRE_LEARNER_PUBLIC_APPROVED'];
test('public learner entry uses the approved stable authority and language, without inherited redirect parameters',()=>{
 const saved=keys.map(key=>process.env[key]);
 try {
  process.env[keys[0]]='https://learn.filumire.com/login?returnTo=https://untrusted.invalid#old';
  process.env[keys[1]]='true';
  for(const lang of ['en','fr']) assert.equal(learnerDestination('start',lang),`https://learn.filumire.com/?lang=${lang}`);
  for(const value of ['', 'javascript:alert(1)', 'https://user:secret@learn.filumire.com', 'https://protected-preview.vercel.app', 'https://protected-preview.vercel.app.', 'https://protected-preview.now.sh', 'https://VERCEL.APP']) {
   process.env[keys[0]]=value;
   for(const lang of ['en','fr']) assert.equal(learnerDestination('start',lang),null);
  }
  delete process.env[keys[0]]; assert.equal(learnerDestination('start','en'),null);
  process.env[keys[0]]='https://learn.filumire.com';
  for(const approval of ['', 'false', 'TRUE']) {process.env[keys[1]]=approval; assert.equal(learnerDestination('start','fr'),null);}
 }finally {keys.forEach((key,index)=>{if(saved[index]===undefined)delete process.env[key];else process.env[key]=saved[index];});}
});

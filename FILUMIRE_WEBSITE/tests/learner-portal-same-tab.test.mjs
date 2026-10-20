import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
// Website → learner links replace the page in the same tab (owner request, 2026-10-20).
// The learner sign-in session lives on the learner origin, so it is kept either way.
const src=fileURLToPath(new URL('../src/',import.meta.url));
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):/\.(tsx|ts)$/.test(e.name)?[join(dir,e.name)]:[]);
test('no learner portal link opens a new tab',()=>{
 const portal=files(src).filter(f=>/learnerDestination|PORTAL_URLS|AccessLink/.test(readFileSync(f,'utf8')));
 assert(portal.length>=4,'portal link components were found');
 for(const file of portal){
  const source=readFileSync(file,'utf8');
  assert.doesNotMatch(source,/_blank|window\.open|opens in a new tab|nouvel onglet/,file);
 }
});

// Real React + Next's styled-jsx compiler. Loopback, authored fixtures, no accounts or external calls.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {seedContent} from '../services/content-store/seed.ts';
import {getContentForCompetency} from '../services/content-store/index.ts';
import {PILOT_REVIEWS} from '../services/outline-visuals/pilot.ts';
import {selectActivityVisuals,selectVerifiedReflectionVisuals} from '../services/outline-visuals/index.ts';
import {resolvePlaywright,launchBrowser} from '../scripts/grade-navigation-support.mjs';
assert.equal(process.env.FILUMIRE_PERSISTENCE,'memory');
const root=resolve(fileURLToPath(new URL('..',import.meta.url))),require=createRequire(resolve(root,'package.json'));
const {build}=require('esbuild'),babel=require('next/dist/compiled/babel/core');
seedContent();
const cases=PILOT_REVIEWS.flatMap(review=>getContentForCompetency(review.competencyId).filter(c=>!c.assessmentItemId).map(content=>({
 content,decision:{action:'teach',competencyId:content.competencyId},language:content.language,visuals:selectActivityVisuals(content,content.language,'teach'),
 reflection:selectVerifiedReflectionVisuals(content,content.language),
})));
assert.equal(cases.length,48);
const bundle=await build({stdin:{contents:`
 import React from 'react'; import {createRoot} from 'react-dom/client';
 import {ActivityOutlineVisuals} from './apps/learner/components/filumire/OutlineVisual';
 import {LessonClosureCard} from './apps/learner/components/filumire/LessonClosureCard';
 const root=createRoot(document.getElementById('root'));
 window.showCase=(value,index,dark=false,reflection=false)=>root.render(<main className="learnerUi" data-appearance={dark?'dark':'light'} data-case={index}>
  {reflection ? <LessonClosureCard closure={{competencyId:value.content.competencyId,language:value.language,interventionId:'verified-fixture',summary:{available:true,title:value.content.title,concepts:[],examples:[],narration:'',visuals:value.reflection},evidence:{attempts:0}}}
   decision={value.decision} phase="summary" onPhase={()=>{}} onContinue={()=>{}} visualContextSafe={!value.content.assessmentItemId}/>
   : <ActivityOutlineVisuals {...value}/>}
 </main>);
`,resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'browser',define:{'process.env.NODE_ENV':'"production"'},plugins:[{
 name:'actual-next-styled-jsx',setup(build){build.onLoad({filter:/[\\/]filumire[\\/](OutlineVisual|LessonClosureCard)\.tsx$/},args=>({
  contents:babel.transformSync(readFileSync(args.path,'utf8'),{filename:args.path,babelrc:false,configFile:false,presets:[[require.resolve('next/babel'),{'preset-env':{modules:false},'transform-runtime':{absoluteRuntime:resolve(root,'node_modules/next/dist/compiled/@babel/runtime')}}]],envName:'production'}).code,loader:'js',resolveDir:resolve(args.path,'..'),
 }));}
}]});
const server=createServer((req,res)=>{if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(bundle.outputFiles[0].text);}else{res.setHeader('content-type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Outline verification</title><style>body{margin:0;padding:12px;font-family:Arial}*{box-sizing:border-box}main{max-width:720px;margin:auto}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin=`http://127.0.0.1:${server.address().port}`;
const {chromium}=await import(resolvePlaywright(root)); let browser;
const out=resolve(root,'.vercel/outline-visuals'); mkdirSync(out,{recursive:true});
try {
 browser=await launchBrowser(chromium);
 const context=await browser.newContext({serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.waitForFunction(()=>Boolean(window.showCase));
 let checks=0;
 for(const width of [320,390,768,1280]) {
  await page.setViewportSize({width,height:1000});
  for(const dark of [false,true]) for(const [index,value] of cases.entries()) {
   const ticket=`${width}-${dark}-${index}`;
   await page.evaluate(({value,ticket,dark})=>window.showCase(value,ticket,dark),{value,ticket,dark});
   await page.waitForFunction(ticket=>document.querySelector('main')?.dataset.case===ticket,ticket);
   assert.equal(await page.locator('figure').count(),value.visuals.length);
   const inspected=await page.evaluate(()=>{
    const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,uniqueIds:new Set(ids).size===ids.length,
     accessible:[...document.querySelectorAll('figure svg[role="img"]')].every(svg=>(svg.getAttribute('aria-labelledby')||'').split(' ').every(id=>Boolean(document.getElementById(id)?.textContent.trim()))),
     readable:[...document.querySelectorAll('figcaption,figure li')].every(e=>parseFloat(getComputedStyle(e).fontSize)>=16),
     geometry:[...document.querySelectorAll('svg[role="img"] text')].every(text=>{const b=text.getBBox(),v=text.ownerSVGElement.viewBox.baseVal;return b.x>=0&&b.y>=0&&b.x+b.width<=v.width+1&&b.y+b.height<=v.height+1;}),
     dark:document.querySelector('figure')?getComputedStyle(document.querySelector('figure')).backgroundColor:null,
     dangerous:document.querySelectorAll('figure foreignObject,figure script,figure image,figure [href],figure [onclick]').length};
   });
   assert(!inspected.overflow,`overflow ${ticket}`);assert(inspected.uniqueIds&&inspected.accessible&&inspected.readable&&inspected.geometry,JSON.stringify({ticket,inspected}));assert.equal(inspected.dangerous,0);
   assert.equal(inspected.dark,dark?'rgb(32, 55, 82)':'rgb(255, 255, 255)');
   const sentence=page.locator('.sentenceParts span');if(await sentence.count())assert(await sentence.evaluateAll(nodes=>nodes.every(n=>n.lang==='en')));
   for(const [i,v] of value.visuals.entries()) if(v.model.kind==='part-whole') {
    const groups=page.locator('figure').nth(i).locator('g[data-fraction]');
    for(const [row,fraction] of v.model.fractions.entries()){
     assert.equal(await groups.nth(row).locator('[data-shaded-part]').count(),fraction.numerator);
     const area=await groups.nth(row).evaluate(g=>[...g.querySelectorAll('[data-shaded-part]')].reduce((sum,r)=>sum+Number(r.getAttribute('width')),0)/460);
     assert(Math.abs(area-fraction.numerator/fraction.denominator)<1e-8,'shaded area matches the printed fraction');
    }
   }
   if(width===390&&!dark&&value.content.type==='lesson')await page.screenshot({path:resolve(out,`pilot-${PILOT_REVIEWS.findIndex(r=>r.competencyId===value.content.competencyId)}-${value.language}.png`),fullPage:true});
   checks++;
  }
 }
 // Malicious/stale visual data cannot be displayed on a scored task or another topic.
 const base=cases[0];
 for(const [i,change] of [
  {content:{...base.content,assessmentItemId:'scored'}}, {decision:{...base.decision,action:'diagnose'}},
  {content:{...base.content,id:'another-content'}}, {content:{...base.content,version:'stale'}},
  {decision:{...base.decision,competencyId:'another-topic'}}, {language:base.language==='en'?'fr':'en'},
  {visuals:base.visuals.map(v=>({...v,hiddenAnswer:'never-in-the-dom'}))},
  {visuals:{hiddenAnswer:'never-in-the-dom'}},
 ].entries()) {
  const ticket=`blocked-${i}`;await page.evaluate(({value,ticket})=>window.showCase(value,ticket),{value:{...base,...change},ticket});
  await page.waitForFunction(ticket=>document.querySelector('main')?.dataset.case===ticket,ticket);assert.equal(await page.locator('figure').count(),0);
  assert(!(await page.content()).includes('never-in-the-dom'));
 }
 for(const language of ['en','fr']){
  const value=cases.find(c=>c.language===language);
  for(const scored of [false,true]){
   const ticket=`reflection-${language}-${scored}`;
   await page.evaluate(({value,ticket})=>window.showCase(value,ticket,false,true),{value:{...value,decision:{...value.decision,action:scored?'practice':'teach'}},ticket});
   await page.waitForFunction(ticket=>document.querySelector('main')?.dataset.case===ticket,ticket);
   assert.equal(await page.locator('figure').count(),scored?0:value.reflection.length);
  }
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',cases:cases.length,renderChecks:checks,widths:[320,390,768,1280],languages:['en','fr'],themes:['light','dark'],assessmentAndStalePayloadGuards:8,reflectionGuards:4,screenshots:12}));
 await context.close();
} finally {await browser?.close();await new Promise(done=>server.close(done));}

// Render only to this Phase 8D review directory; original PDFs are immutable inputs.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {here,sourceRoot,manifest,load,save,pdfModule,canvasModule} from './phase8d-source.mjs';
const {getDocument}=await import(pdfModule),{createCanvas}=await import(canvasModule);
const out=join(here,'phase8d-review');mkdirSync(out,{recursive:true});
const contextOnly=process.argv.includes('--context-only');
const index=contextOnly?load('phase8d-review/render-index.json'):[];
const fullPages=contextOnly?{english:[36],mathematics:[],computing:[],science:[37]}:{english:[36,85,89,108,111,135,136],mathematics:[125,137,173,179,198,200,201,237,239],computing:[57,58,60,70,71,78],science:[37,93,112,114,122,126,131,133,134,135,148,149,153,154]};
for(const d of manifest.documents){
 const task=getDocument({data:new Uint8Array(readFileSync(join(sourceRoot,d.local_path))),useSystemFonts:true,isEvalSupported:false}),pdf=await task.promise,cache=new Map();
 async function rendered(n){if(cache.has(n))return cache.get(n);const page=await pdf.getPage(n),scale=1.5,viewport=page.getViewport({scale}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;const r={canvas,page,scale};cache.set(n,r);return r;}
 for(const grade of contextOnly?[]:[8,9]){
  const s=load(`basic${grade}-curriculum-inventory.json`).subjects.find(s=>s.id===d.id);
  for(let start=0;start<s.indicators.length;start+=12){
   const rows=s.indicators.slice(start,start+12),canvas=createCanvas(1140,rows.length*185),ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
   for(let k=0;k<rows.length;k++){
    const r=rows[k],im=await rendered(r.pdf_page),sy=(im.page.view[3]-r.code_anchor.y-17)*im.scale,sh=Math.min(155,im.canvas.height-sy);
    ctx.fillStyle='#e5e7eb';ctx.fillRect(0,k*185,1140,25);ctx.fillStyle='black';ctx.font='15px sans-serif';ctx.fillText(`B${grade} | ${r.entry_id} | printed ${r.printed_page} | ${r.official_code}`,10,k*185+18);
    ctx.drawImage(im.canvas,60,sy,1140,sh,0,k*185+27,1140,sh);
   }
   const name=`b${grade}-${d.id}-headers-${Math.floor(start/12)+1}.png`;writeFileSync(join(out,name),canvas.toBuffer('image/png'));index.push({path:`phase8d-review/${name}`,kind:'leading_indicator_contact_sheet',entries:rows.map(r=>r.entry_id),grade});
  }
 }
 for(const n of fullPages[d.id]){const im=await rendered(n),name=`${d.id}-pdf${n}.png`;writeFileSync(join(out,name),im.canvas.toBuffer('image/png'));index.push({path:`phase8d-review/${name}`,kind:'supplemental_source_page',subject:d.id,pdf_page:n});}
 await task.destroy();console.log(`${d.id}: rendered header sheets and supplemental source pages.`);
}
save('phase8d-review/render-index.json',index);

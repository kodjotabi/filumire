// Phase 8D documentation tools. Original repository and PDFs are read-only inputs.
import {readFileSync, readdirSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve, dirname, join} from 'node:path';
import {createHash} from 'node:crypto';
export const here=dirname(fileURLToPath(import.meta.url));
export const relativeBase='docs/curriculum-sources/ghana/ccp-b7-b9';
export const sourceRoot=resolve(process.env.FILUMIRE_SOURCE_ROOT||'C:/FILUMIRE/filumire-batch1/FILUMIRE_CLAUDE');
export const sourceBase=join(sourceRoot,relativeBase);
export const sha=b=>createHash('sha256').update(b).digest('hex');
export const load=(name,base=here)=>JSON.parse(readFileSync(join(base,name),'utf8'));
export const save=(name,value)=>writeFileSync(join(here,name),JSON.stringify(value,null,2)+'\n');
export const norm=s=>s.replace(/\s+/g,' ').trim();
export const manifest=load('basic7-source-manifest.json',sourceBase);
export const pdfModule=process.env.FILUMIRE_PDFJS_MODULE||pathToFileURL('C:/Users/tabi/AppData/Local/Temp/filumire-b7-pdf-tools/node_modules/pdfjs-dist/legacy/build/pdf.mjs').href;
export const canvasModule=process.env.FILUMIRE_CANVAS_MODULE||pathToFileURL('C:/Users/tabi/AppData/Local/Temp/filumire-b7-pdf-tools/node_modules/@napi-rs/canvas/index.js').href;
export function inputState(){
 return {source_root:sourceRoot,files:readdirSync(sourceBase,{withFileTypes:true}).filter(e=>e.isFile()).map(e=>e.name).map(name=>({path:`${relativeBase}/${name}`,sha256:sha(readFileSync(join(sourceBase,name)))})),
 protected_application_files:['apps/learner/app/api/learning/closure/route.ts','apps/learner/app/learn/page.tsx','apps/learner/components/filumire/AnswerCorrectionPanel.tsx','apps/learner/services/learner-interface.ts','packages/curriculum-framework/index.ts','packages/curriculum-framework/ghana-b4-english.ts','packages/curriculum-framework/ghana-b7-ccp-data.json','packages/curriculum-framework/ghana-b7-ccp.ts','scripts/generate-b7-framework.mjs','tests/ask-filu-navigation.browser.mjs','tests/immediate-correction.test.ts','tests/learner-interface-copy.test.ts','tests/lesson-closure-production.test.ts'].map(path=>({path,sha256:sha(readFileSync(join(sourceRoot,path)))}))};
}
export function lines(items){
 const groups=[];
 for(const i of [...items].sort((a,b)=>b.y-a.y||a.x-b.x)){
  if(!i.s.trim())continue;
  let g=groups.find(g=>Math.abs(g.y-i.y)<2);if(!g)groups.push(g={y:i.y,items:[]});g.items.push(i);
 }
 return groups.sort((a,b)=>b.y-a.y).map(g=>({y:g.y,text:norm(g.items.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' '))}));
}
export async function extractPositioned(){
 const {getDocument}=await import(pdfModule),out={schema_version:1,tool:'pdfjs-dist positioned text',documents:[]};
 for(const d of manifest.documents){
  const bytes=readFileSync(join(sourceRoot,d.local_path));if(sha(bytes)!==d.sha256)throw Error(`Source hash mismatch: ${d.id}`);
  const task=getDocument({data:new Uint8Array(bytes),useSystemFonts:true,isEvalSupported:false}),pdf=await task.promise,pages=[];
  for(let n=1;n<=pdf.numPages;n++){
   const p=await pdf.getPage(n),content=await p.getTextContent();
   pages.push({pdf_page:n,width:p.view[2],height:p.view[3],items:content.items.filter(i=>'str'in i).map(i=>({s:i.str,x:i.transform[4],y:i.transform[5],width:i.width,height:i.height}))});
  }
  out.documents.push({id:d.id,sha256:d.sha256,pages});await task.destroy();
 }
 return out;
}
if(process.argv.includes('--extract-text')){
 mkdirSync(join(here,'phase8d-review'),{recursive:true});
 if(!process.argv.includes('--refresh'))save('phase8d-input-lock.json',inputState());
 save('phase8d-review/positioned-text.json',await extractPositioned());
 console.log('Pinned all original inputs and extracted source-positioned text.');
}

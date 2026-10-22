// Read-only PDF inputs; writes review images outside the project to FILUMIRE_B7_REVIEW_DIR.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const {getDocument}=await import(process.env.FILUMIRE_PDFJS_MODULE);
const {createCanvas}=await import(process.env.FILUMIRE_CANVAS_MODULE);
const out=process.env.FILUMIRE_B7_REVIEW_DIR;
if(!out||resolve(out).startsWith(resolve('.')+'\\'))throw Error('Set a temporary review directory outside the project.');
mkdirSync(out,{recursive:true});
const base='docs/curriculum-sources/ghana/ccp-b7-b9';
const structure=JSON.parse(readFileSync(`${base}/basic7-curriculum-structure.json`));
const manifest=JSON.parse(readFileSync(`${base}/basic7-source-manifest.json`));
const index=[];
for(const s of structure.subjects){
  const task=getDocument({data:new Uint8Array(readFileSync(manifest.documents.find(d=>d.id===s.id).local_path)),useSystemFonts:true});
  const pdf=await task.promise,cache=new Map();
  for(let start=0;start<s.indicators.length;start+=12){
    const rows=s.indicators.slice(start,start+12),canvas=createCanvas(1140,rows.length*180),ctx=canvas.getContext('2d');
    ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
    for(let k=0;k<rows.length;k++){
      const r=rows[k];let p=cache.get(r.pdf_page);
      if(!p){const page=await pdf.getPage(r.pdf_page),viewport=page.getViewport({scale:1.5});
        const image=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
        await page.render({canvasContext:image.getContext('2d'),viewport}).promise;
        p={image,height:page.getViewport({scale:1}).height,items:(await page.getTextContent()).items};cache.set(r.pdf_page,p);
      }
      const anchor=p.items.find(i=>i.str?.includes(r.source_code_raw)&&i.transform[4]>=190&&i.transform[4]<280);
      if(!anchor)throw Error(`Missing source anchor ${r.entry_id}`);
      const sy=(p.height-anchor.transform[5]-16)*1.5,sh=Math.min(150,p.image.height-sy);
      ctx.fillStyle='#e5e7eb';ctx.fillRect(0,k*180,1140,25);ctx.fillStyle='black';ctx.font='15px sans-serif';
      ctx.fillText(`${r.entry_id} | printed page ${r.printed_page} | ${r.official_code}`,10,k*180+18);
      ctx.drawImage(p.image,75,sy,1140,sh,0,k*180+27,1140,sh);
    }
    const name=`${s.id}-${Math.floor(start/12)+1}.png`;writeFileSync(`${out}/${name}`,canvas.toBuffer('image/png'));
    index.push({name,entries:rows.map(r=>r.entry_id)});
  }
  await task.destroy();
}
writeFileSync(`${out}/index.json`,JSON.stringify(index,null,2)+'\n');
console.log(`Rendered ${structure.subjects.flatMap(s=>s.indicators).length} source indicator headers in ${index.length} sheets.`);

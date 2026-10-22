import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const gs=process.env.GHOSTSCRIPT_PATH || 'C:/Program Files/gs/gs10.03.1/bin/gswin64c.exe';
const documents={mathematics:{file:'NaCCA-Mathematics-B4-B6-2019.pdf',start:23},english:{file:'ENGLISH-B4-B6.pdf',start:26},science:{file:'NaCCA-Science-B4-B6-2019.pdf',start:24},computing:{file:'NaCCA-Computing-B4-B6-2019.pdf',start:23}};
const decode=s=>s.replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const pages=xml=>xml.split('<page>').slice(1).map((p,idx)=>{var chars=[...p.matchAll(/<char bbox="([\d. -]+)" c="([^"]*)"\/>/g)].map(m=>({x:+m[1].split(' ')[0],y:+m[1].split(' ')[1],right:+m[1].split(' ')[2],text:decode(m[2])}));var ys=new Map();for(var ch of chars){var y=Math.round(ch.y);if(!ys.has(y))ys.set(y,[]);ys.get(y).push(ch);}return {page:idx+1,rows:[...ys].sort((a,b)=>a[0]-b[0]).map(([y,ch])=>{ch.sort((a,b)=>a.x-b.x);return {y,chars:ch,text:ch.map(c=>c.text).join('')}})}});
const codes=(row)=>[...row.text.matchAll(/B[456](?:\s*\.\s*\d+){2,4}/g)].map(m=>({raw:m[0],code:m[0].replace(/\s/g,''),x:row.chars[m.index]?.x||0,y:row.y}));
const clean=s=>s.replace(/\s+/g,' ').trim();
const results=[], inventories=[], sources=[];
for(const [subject,doc] of Object.entries(documents)){
 const file=resolve(root,'public/curriculum-sources',doc.file);
 const xml=execFileSync(gs,['-q','-dBATCH','-dNOPAUSE','-sDEVICE=txtwrite','-dTextFormat=0','-sOutputFile=-',file],{encoding:'utf8',maxBuffer:150000000});
 const pp=pages(xml), nodes=new Map(), names=new Map(), issues=[], repeated=[];
 let grade=4,strandHeading=null,subHeading=null,previousBoundary=220,previousRight=600;
 const inventory=new Set();
 for(const page of pp.filter(p=>p.page>=doc.start)){
  const gradeRow=page.rows.find(r=>r.y<130 && /^(?:BASIC\s+|Basic\s+|B)([456])\s*$/.test(clean(r.text)));
  if(gradeRow){grade=+clean(gradeRow.text).match(/[456]/)[0];strandHeading=null;subHeading=null;}
  const candidates=page.rows.flatMap(r=>codes(r)).filter(c=>c.code.split('.').length>=4);
  const indicator=candidates.find(c=>c.code.split('.').length===5 && c.x>=150 && c.x<320);
  const standard=candidates.find(c=>c.code.split('.').length===4 && c.x<210);
  let boundary=indicator?.x ?? previousBoundary;
  previousBoundary=boundary;
  const rightHeader=page.rows.find(r=>/SUBJECT SPECIFIC/.test(clean(r.text)));
  const headerX=rightHeader ? rightHeader.chars[rightHeader.text.indexOf('SUBJECT')]?.x : undefined;
  let right=headerX ? headerX-30 : previousRight;
  const competencyRow=page.rows.find(r=>/Learners develop:|Core Competencies|Listening and Speaking|1\. Creativity/.test(r.text)&&r.y>170);
  if(competencyRow){const mm=competencyRow.text.match(/Learners develop:|Core Competencies|Listening and Speaking|1\. Creativity/);const xx=competencyRow.chars[mm.index]?.x;if(xx>boundary+200)right=xx-3;}
  previousRight=right;
  const startY=Math.min(...candidates.filter(c=>c.x<right).map(c=>c.y));
  if(!Number.isFinite(startY))continue;
  let activeStandard=null,activeIndicator=null,indicatorStopped=false;
  const pushText=(node,t)=>{if(!node||!t)return;node.fragments.push(t);};
  const make=(c,kind)=>{
   inventory.add(c.code);
   const parts=c.code.split('.'),g=+parts[0].slice(1),key=subject+':'+grade+':'+c.code;
   if(g!==grade)issues.push({page:page.page,code:c.code,reason:'Printed code differs from class heading; retained without correction.'});
   const strandCode=parts.slice(0,2).join('.'),subCode=parts.slice(0,3).join('.');
   if(strandHeading&&strandHeading.number===+parts[1])names.set(grade+':'+strandCode,names.get(grade+':'+strandCode)||{title:strandHeading.title,page:strandHeading.page});
   if(subHeading&&subHeading.number===+parts[2])names.set(grade+':'+subCode,names.get(grade+':'+subCode)||{title:subHeading.title,page:subHeading.page});
   const n={id:key,subject,grade,printedGrade:g,code:c.code,kind,parentCode:parts.slice(0,-1).join('.'),source:subject,pages:[page.page],fragments:[]};
   if(nodes.has(key)){nodes.get(key).pages.push(page.page);n.repeat=true;repeated.push(n);}
   else nodes.set(key,n);
   return n;
  };
  for(const row of page.rows.filter(r=>r.y<545)){
   const st=clean(row.text).match(/^STRAND\s*(\d+)\s*[:.\-]\s*(.+)/i);
   const su=clean(row.text).match(/^SUB[ -]?STRAND\s*(\d+)\s*[:.\-]\s*(.+)/i);
   if(st){strandHeading={number:+st[1],title:st[2],page:page.page};names.set(grade+':B'+grade+'.'+st[1],{title:st[2],page:page.page});}
   if(su){subHeading={number:+su[1],title:su[2],page:page.page};if(strandHeading)names.set(grade+':B'+grade+'.'+strandHeading.number+'.'+su[1],{title:su[2],page:page.page});}
   if(row.y<startY || st || su)continue;
   if(/©|CONTENT STANDARDS|INDICATORS AND EXEMPLARS|SUBJECT SPECIFIC|AND CORE COMPETENC|^\s*\d+\s*$/.test(row.text))continue;
   const rowIndicator=codes(row).find(c=>c.code.split('.').length===5 && c.x>=150 && c.x<320); if(rowIndicator)boundary=rowIndicator.x;
   const left=clean(row.chars.filter(c=>c.x<boundary-3).map(c=>c.text).join(''));
   const middle=clean(row.chars.filter(c=>c.x>=boundary-3&&c.x<right).map(c=>c.text).join(''));
   const sm=left.match(/^(B[456](?:\s*\.\s*\d+){3})(?!\s*\.\s*\d)/);
   if(sm){activeStandard=make({code:sm[1].replace(/\s/g,''),x:0,y:row.y},'content_standard');pushText(activeStandard,left.slice(sm[0].length).replace(/^[:. ]+/,''));}
   else if(activeStandard && left && !/^CONT(?:ENT|INUED)|^STANDARDS|^CONT’D/i.test(left))pushText(activeStandard,left);
   const im=middle.match(/^(B[456](?:\s*\.\s*\d+){4})/);
   if(im){activeIndicator=make({code:im[1].replace(/\s/g,''),x:boundary,y:row.y},'learning_indicator');indicatorStopped=false;const tableStandard=candidates.filter(c=>c.code.split('.').length===4&&c.x<boundary-5&&c.y<=row.y+6).at(-1);if(tableStandard&&tableStandard.code!==activeIndicator.parentCode){activeIndicator.printedDerivedParentCode=activeIndicator.parentCode;activeIndicator.parentCode=tableStandard.code;issues.push({page:page.page,code:activeIndicator.code,reason:'Printed indicator prefix differs from its table content standard; table association retained.'});}pushText(activeIndicator,middle.slice(im[0].length).replace(/^[:. ]+/,''));}
   else if(activeIndicator && middle){if(/^(?:E\.?g\.?|Exemplar|Example|[•●▪]|Bring |Guide |Assist |Ask learners|Let learners|Take learners|Teacher |Teachers |Engage learners|Put learners)/i.test(middle))indicatorStopped=true;if(!indicatorStopped)pushText(activeIndicator,middle);}
  }
 }
 for(const repeat of repeated.filter(n=>n.kind==='learning_indicator')){
  const original=nodes.get(repeat.id);const statement=clean(repeat.fragments.join(' '));const first=clean(original.fragments.join(' '));
  if(statement && statement!==first){original.variants=original.variants||[];original.variants.push({statement,pages:repeat.pages,parentCode:repeat.parentCode});issues.push({code:repeat.code,page:repeat.pages[0],reason:'Same printed indicator code has a different statement or table occurrence; both retained for verification.'});}
 }
 for(const node of [...nodes.values()]){
  node.statement=clean(node.fragments.join(' ')).replace(/\s*CONT[’']?D.*$/i,'');delete node.fragments;
  if(!node.statement)issues.push({code:node.code,page:node.pages[0],reason:'Statement could not be extracted; consult linked official PDF.'});
  for(const [kind,len] of [['strand',2],['sub_strand',3]]){
   const code=node.code.split('.').slice(0,len).join('.'),id=subject+':'+node.grade+':'+code;
   if(!nodes.has(id)){const heading=names.get(node.grade+':'+code);nodes.set(id,{id,subject,grade:node.grade,code,kind,parentCode:len===3?code.split('.').slice(0,2).join('.'):null,statement:heading?.title||'',source:subject,pages:heading?[heading.page]:node.pages,review:heading?'source_heading':'heading_not_extracted'});if(!heading)issues.push({code,page:node.pages[0],reason:'Hierarchy name not extracted; code retained, no title invented.'});}
  }
 }
 const all=[...nodes.values()].map(n=>({...n,pages:[...new Set(n.pages)]}));
 results.push(...all);inventories.push({subject,codes:[...inventory].sort(),issues});
 sources.push({id:subject,file:'/curriculum-sources/'+doc.file,edition:'September 2019',authority:'NaCCA / Ministry of Education, Ghana',sha256:createHash('sha256').update(await readFile(file)).digest('hex'),pdfPages:pp.length,detailStartsAt:doc.start,verification:'source-extracted; outstanding issues listed in inventory'});
}
const exceptions=JSON.parse(await readFile(resolve(root,'src/lib/curriculum/verified-exceptions.json'),'utf8'));
for(const node of exceptions.nodes){if(!results.some(n=>n.id===node.id))results.push(node);}
for(const override of exceptions.relationships){const node=results.find(n=>n.id===override.id);if(!node)throw new Error('Missing exception target '+override.id);node.parentCode=override.parentCode;node.review='Malformed printed standard retained; table association verified.';}
for(const issue of exceptions.issues)inventories.find(i=>i.subject===issue.subject).issues.push(issue);
results.sort((a,b)=>a.grade-b.grade||a.subject.localeCompare(b.subject)||a.code.localeCompare(b.code,undefined,{numeric:true}));
await writeFile(resolve(root,'src/lib/curriculum/requirements.json'),JSON.stringify(results,null,2)+'\n');
await writeFile(resolve(root,'src/lib/curriculum/sources.json'),JSON.stringify(sources,null,2)+'\n');
await writeFile(resolve(root,'src/lib/curriculum/inventory.json'),JSON.stringify(inventories,null,2)+'\n');
console.log(JSON.stringify({nodes:results.length,issues:inventories.map(i=>({subject:i.subject,count:i.issues.length}))}));

// Documentation only. Never writes to the input repository or to Phase 8A/8B files.
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {here,sourceBase,manifest,load,save,norm,lines,sha} from './phase8d-source.mjs';
export const configs={
 english:{ranges:{8:[74,104],9:[106,136]},offset:36,middle:195,right:530,footer:50,assessment:[18,23]},
 mathematics:{ranges:{8:[120,193],9:[195,250]},offset:30,middle:190,right:605,footer:50,assessment:[18,21]},
 computing:{ranges:{8:[53,68],9:[70,85]},offset:29,middle:205,right:570,footer:45,assessment:[17,20]},
 science:{ranges:{8:[89,122],9:[124,160]},offset:37,middle:198,right:540,footer:50,assessment:[20,25]},
};
export const codeStart=/^(?:B\s*\.?\s*[789]\s*\.?\s*\d+(?:\s*\.\s*\d+)*|[789]\s*\.\s*\d+(?:\s*\.\s*\d+)*)/;
const positioned=load('phase8d-review/positioned-text.json');
const overrides=load('phase8d-reviewed-corrections.json');
const marker=/^(?:[\u2022\uf0b7]|\d+[.)]\s|[ivx]+[.)]\s|E\s*\.\s*g\s*\.|Exemplars?)/i;
export function derive(grade){
 const result={schema_version:1,phase:'8D',grade:`Basic ${grade}`,status:'documentation_only_unregistered',
  policy:'One record per printed leading indicator entry in the physical grade section, even when its printed code names another grade or is duplicated/malformed. Embedded references do not create new entries. No source-code repairs, lessons or assessments.',
  page_numbering:'One-based PDF pages and actual printed footer labels; source pages include continuation/exemplar pages.',
  extraction_method:'PDF.js positioned text separated by table columns and row bands. Full raw fragments and page regions retained; figures and mathematical layout remain authoritative in the pinned PDF.',subjects:[]};
 for(const doc of manifest.documents){
  const c=configs[doc.id],pages=positioned.documents.find(d=>d.id===doc.id).pages,[first,last]=c.ranges[grade];
  const s={id:doc.id,subject:doc.subject,grade:`Basic ${grade}`,document:{id:doc.id,path:doc.local_path,url:doc.source_url,sha256:doc.sha256},pdf_pages:[first,last],printed_pages:[String(first-c.offset),String(last-c.offset)],headings:[],content_standards:[],indicators:[],assessment_guidance:[],source_candidate_audit:[],page_coverage:[]};
  const standards=new Map();let strand=null,sub=null,standard=null,standardContext=null;
  for(const page of pages.slice(first-1,last)){
   const printed=page.items.find(i=>i.y<50&&i.s.trim()===String(page.pdf_page-c.offset));
   if(!printed)throw Error(`Missing actual printed page ${doc.id}:${page.pdf_page}`);
   const headers=page.items.filter(i=>/^\s*(?:SUB[- ]?STRAND|STRAND)\b/i.test(i.s));
   const headerYs=headers.map(i=>i.y),core=page.items.find(i=>/^CORE COMPETENCIES/.test(i.s.trim()));
   const coreText=page.items.filter(i=>i.x>450&&/^(?:Communication and Collaboration|Critical Thinking and|Creativity and Innovation|Digital Literacy|Personal Development and)/.test(i.s.trim()));
   const right=Math.min(c.right,...coreText.map(i=>i.x-3),...(doc.id==='science'&&core?[core.x-3]:[]));
   const cells=page.items.filter(i=>i.s.trim()&&i.y>c.footer&&!/^(?:CONTENT(?: STANDARDS?)?|STANDARDS?|INDICATORS AND EXEMPLAR.*|CORE(?: COMPETENCIES.*)?|SUBJECT SPECIFIC PRACTICES)$/.test(i.s.trim())&&!headerYs.some(y=>Math.abs(i.y-y)<2));
   const events=headers.map(i=>({kind:/^\s*SUB/i.test(i.s)?'sub':'strand',item:i}));
   for(const i of cells.filter(i=>codeStart.test(i.s.trim()))){
    const before=cells.filter(j=>Math.abs(j.y-i.y)<2&&j.x>=c.middle&&j.x<i.x-0.1).map(j=>j.s).join(' ');
    const kind=i.x<c.middle?'standard':i.x<c.middle+85&&!/[A-Za-z]/.test(before)?'indicator':i.x<right?'embedded_reference':'core_reference';
    const line=lines(cells.filter(j=>Math.abs(j.y-i.y)<2&&j.x>=i.x-0.1&&j.x<(kind==='standard'?c.middle:right)))[0]?.text||i.s;
    const raw=codeStart.exec(line)[0],event={kind,item:i,raw,code:raw.replace(/\s+/g,'')};
    const decision=overrides.candidate_decisions?.[`${doc.id}:pdf${page.pdf_page}:y${i.y.toFixed(2)}`];
    if(decision)event.kind=decision.kind;
    s.source_candidate_audit.push({pdf_page:page.pdf_page,x:i.x,y:i.y,raw_item_text:i.s,code_source_line:line,source_code_raw:raw,classification:event.kind,review_decision:decision||null});
    if(['standard','indicator'].includes(event.kind))events.push(event);
   }
   events.sort((a,b)=>Math.abs(b.item.y-a.item.y)<12?a.item.x-b.item.x:b.item.y-a.item.y);
   const indicatorEvents=events.filter(e=>e.kind==='indicator');
   const rows=[];
   for(const e of events){
    const i=e.item;
    if(e.kind==='strand'||e.kind==='sub'){
     const h={kind:e.kind==='strand'?'strand':'sub_strand',official_heading:lines(page.items.filter(j=>Math.abs(j.y-i.y)<2)).map(l=>l.text).join(' '),pdf_page:page.pdf_page,printed_page:String(page.pdf_page-c.offset)};
     s.headings.push(h);if(e.kind==='strand'){strand=h;sub=null;}else sub=h;continue;
    }
    if(e.kind==='standard'){
     const lower=events.filter(z=>z.kind==='standard'&&z.item.y<i.y-2).reduce((a,z)=>Math.max(a,z.item.y),c.footer);
     const text=lines(cells.filter(j=>j.x<c.middle&&j.y<=i.y+2&&j.y>lower+2)).map(l=>l.text).join('\n');
     if(!standards.has(e.code)){
      standard={official_code:e.code,source_code_raw:e.raw,statement_raw:text,source_pages:[],page_fragments:[],strand_heading:strand?.official_heading??null,sub_strand_heading:sub?.official_heading??null};
      standards.set(e.code,standard);s.content_standards.push(standard);
     }else standard=standards.get(e.code);
     standard.source_pages.push(page.pdf_page);standard.page_fragments.push({pdf_page:page.pdf_page,text});standardContext={official_code:e.code,source_code_raw:e.raw,statement_raw:text,pdf_page:page.pdf_page,printed_page:String(page.pdf_page-c.offset)};continue;
    }
    const k=indicatorEvents.indexOf(e)+1;
    const r={entry_id:`${doc.id}:pdf${page.pdf_page}:row${k}`,official_code:e.code,source_code_raw:e.raw,code_source_line:s.source_candidate_audit.find(a=>a.pdf_page===page.pdf_page&&a.x===i.x&&a.y===i.y).code_source_line,
     code_anchor:{x:i.x,y:i.y,raw_item_text:i.s},pdf_page:page.pdf_page,printed_page:String(page.pdf_page-c.offset),source_pages:[],source_regions:[],
     content_standard_code_as_printed:standard?.official_code??null,displayed_content_standard:standardContext,strand_heading:strand?.official_heading??null,strand_heading_source:strand,sub_strand_heading:sub?.official_heading??null,sub_strand_heading_source:sub,
     indicator_statement:'',source_cell_text:'',core_competencies_text:'',flags:[]};
    const stdKey=standard?.official_code.replace(/^B\.([89])/,'B$1').replace(/^B82\./,'B8.2.');
    const stdDigits=(stdKey?.match(/\d+/g)||[]).join('.'),subNumber=sub?.official_heading.match(/SUB[- ]?STRAND\s*(\d+)/i)?.[1],strandNumber=strand?.official_heading.match(/^STRAND\s*(\d+)/i)?.[1];
    if(strandNumber&&stdDigits.split('.')[1]!==strandNumber){r.preceding_strand_heading=r.strand_heading;r.strand_heading=null;r.strand_heading_source=null;r.flags.push('missing_or_mismatched_explicit_strand_heading');}
    if(subNumber&&stdDigits.split('.')[2]!==subNumber){r.preceding_sub_strand_heading=r.sub_strand_heading;r.sub_strand_heading=null;r.sub_strand_heading_source=null;r.flags.push('missing_or_mismatched_explicit_sub_strand_heading');}
    s.indicators.push(r);rows.push({event:e,row:r});
   }
   const preceding=s.indicators.filter(r=>r.pdf_page<page.pdf_page).at(-1),bands=[];
   if(preceding)bands.push({row:preceding,top:Infinity,bottom:rows[0]?rows[0].event.item.y+2:c.footer});
   for(let k=0;k<rows.length;k++)bands.push({row:rows[k].row,top:rows[k].event.item.y+2,bottom:rows[k+1]?rows[k+1].event.item.y+2:c.footer});
   let accounted=0;
   for(const band of bands){
    const chosen=cells.filter(j=>j.y<=band.top&&j.y>band.bottom&&j.x>=c.middle&&j.x<right),ll=lines(chosen);
    if(!ll.length)continue;accounted+=chosen.length;
    const text=ll.map(l=>l.text).join('\n'),r=band.row;
    r.source_pages.push(page.pdf_page);r.source_cell_text+=(r.source_cell_text?'\n':'')+text;
    r.source_regions.push({pdf_page:page.pdf_page,x_min:c.middle,x_max:right,y_min:band.bottom,y_max:Number.isFinite(band.top)?band.top:page.height,text,raw_fragments:chosen});
    if(r.pdf_page===page.pdf_page){
     const firstParagraph=[];
     for(const l of ll){if(firstParagraph.length&&(firstParagraph.at(-1).y-l.y>(doc.id==='english'?17:21)||marker.test(l.text)))break;firstParagraph.push(l);}
     r.indicator_statement=norm(firstParagraph.map(l=>l.text).join(' ').replace(/^[\u2022\uf0b7]\s*(?=B)/,'').replace(codeStart,'').replace(/^[\s.:-]+/,''));
    }
    const textCore=lines(cells.filter(j=>j.y<=band.top&&j.y>band.bottom&&j.x>=right)).map(l=>l.text).join('\n');
    r.core_competencies_text+=(r.core_competencies_text?'\n':'')+textCore;
   }
   const middleFragments=cells.filter(j=>j.x>=c.middle&&j.x<right);
   s.page_coverage.push({pdf_page:page.pdf_page,printed_page:String(page.pdf_page-c.offset),indicator_anchors:rows.length,indicator_column_fragments:middleFragments.length,assigned_fragments:accounted,unassigned_fragments:middleFragments.filter(i=>!bands.some(b=>i.y<=b.top&&i.y>b.bottom))});
  }
  for(const r of s.indicators){
   const correction=overrides.statements?.[`${grade}:${r.entry_id}`];
   r.statement_transcription_method=correction?'reviewed_source_transcription':'positioned_text_first_paragraph';
   if(correction){r.automated_statement_before_review=r.indicator_statement;r.indicator_statement=correction.statement;r.transcription_review=correction;}
   const stop=r.indicator_statement.search(/Exemplars?(?:\(s\))?\s*:?|[\u2022\uf0b7]/i);if(stop>=0)r.indicator_statement=norm(r.indicator_statement.slice(0,stop));
   if(!new RegExp(`^B${grade}(?:\\.\\d+){4}$`).test(r.official_code))r.flags.push('nonstandard_or_cross_grade_printed_code_preserved');
   if(s.indicators.filter(q=>q.official_code===r.official_code).length>1)r.flags.push('duplicate_printed_code_distinct_entries');
   if(r.official_code.split('.').slice(0,-1).join('.')!==r.content_standard_code_as_printed)r.flags.push('indicator_prefix_differs_from_displayed_parent');
   if(!r.sub_strand_heading)r.flags.push('missing_official_sub_strand_heading');
   if(!r.strand_heading)r.flags.push('missing_official_strand_heading');
   if(!r.indicator_statement)r.flags.push('missing_or_unreadable_statement');
   if(/\uFFFD|Critical Thinking and|Communication and Collaboration/.test(r.indicator_statement))r.flags.push('statement_encoding_or_column_contamination_requires_review');
   const cross=[...r.source_cell_text.matchAll(/B\s*\.?\s*([789])\s*\.(?:\s*\d+\s*\.){2,}\s*\d+/g)].filter(m=>Number(m[1])!==grade).map(m=>m[0]);
   if(cross.length){r.cross_grade_references=[...new Set(cross)];r.flags.push('cross_grade_code_in_source_cell');}
  }
  for(const st of s.content_standards){st.source_pages=[...new Set(st.source_pages)];st.flags=[];if(!new RegExp(`^B${grade}(?:\\.\\d+){3}$`).test(st.official_code))st.flags.push('nonstandard_printed_content_standard');}
  for(let n=c.assessment[0];n<=c.assessment[1];n++){const p=pages[n-1];s.assessment_guidance.push({pdf_page:n,printed_page:p.items.find(i=>i.y<50&&/^[ivxlcdm]+$/.test(i.s.trim()))?.s.trim()??null,source_text_raw:norm(p.items.map(i=>i.s).join(' '))});}
  s.counts={indicator_entries:s.indicators.length,distinct_printed_codes:new Set(s.indicators.map(r=>r.official_code)).size,content_standards:s.content_standards.length,flagged_entries:s.indicators.filter(r=>r.flags.length).length};result.subjects.push(s);
 }
 return result;
}
const csvCell=x=>'"'+String(x??'').replaceAll('"','""')+'"';
export function csv(fields,rows){return [fields.map(csvCell).join(','),...rows.map(r=>fields.map(f=>csvCell(r[f])).join(','))].join('\n')+'\n';}
if(process.argv[1]?.endsWith('extract-basic89.mjs'))for(const grade of [8,9]){
 const out=derive(grade);save(`basic${grade}-curriculum-inventory.json`,out);
 const rows=out.subjects.flatMap(s=>s.indicators.map(r=>({...r,subject:s.subject,grade,source_pdf:s.document.path,source_sha256:s.document.sha256,source_url:s.document.url,source_pages:r.source_pages.join(';'),flags:r.flags.join(';')})));
 writeFileSync(join(here,`basic${grade}-curriculum-inventory.csv`),csv(['grade','subject','entry_id','official_code','source_code_raw','strand_heading','sub_strand_heading','content_standard_code_as_printed','indicator_statement','source_pdf','source_url','source_sha256','pdf_page','printed_page','source_pages','flags'],rows));
 console.log(JSON.stringify({grade,counts:out.subjects.map(s=>({subject:s.id,...s.counts})),flagged:out.subjects.flatMap(s=>s.indicators.filter(r=>r.flags.length).map(r=>({entry:r.entry_id,code:r.official_code,flags:r.flags})))}));
}

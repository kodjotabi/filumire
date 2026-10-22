// Documentation-only extraction. No runtime imports, curriculum registrations, or authored lessons.
// Run from repository root with FILUMIRE_PDFJS_MODULE pointing to an installed pdfjs-dist PDF module.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const directory = 'docs/curriculum-sources/ghana/ccp-b7-b9';
const manifestPath = `${directory}/basic7-source-manifest.json`;
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
if (!process.env.FILUMIRE_PDFJS_MODULE) throw new Error('Set FILUMIRE_PDFJS_MODULE to the external pdfjs-dist module URL.');
const { getDocument } = await import(process.env.FILUMIRE_PDFJS_MODULE);
const configs = {
  english: { first: 38, last: 72, offset: 36, middle: 195, right: 530, footer: 50, assessment: [18, 23] },
  mathematics: { first: 32, last: 118, offset: 30, middle: 200, right: 605, footer: 50, assessment: [18, 21] },
  computing: { first: 31, last: 51, offset: 29, middle: 205, right: 570, footer: 45, assessment: [17, 20] },
  science: { first: 39, last: 87, offset: 37, middle: 198, right: 540, footer: 50, assessment: [20, 25] },
};
const codeStart = /^(?:B\s*\.?\s*)?7\s*\.?\s*\d+(?:\s*\.\s*\d+)*/;
// Visual transcriptions of statements whose equations/superscripts or exemplar layout defeat plain text order.
// These preserve the visible source meaning and are explicitly marked; raw PDF text is retained separately.
const visualStatements = {
  'mathematics:44:B7.1.2.3.4':'Find the value of a number written in index form.',
  'mathematics:49:B7.1.3.1.2':'Compare and order fractions (i.e. common, percent and decimal fractions up to thousandths) limit to the benchmark fractions.',
  'mathematics:54:B7.1.4.1.2':'Use the concept of a unit rate a/b associated with a ratio a:b with b ≠ 0, and use rate language in the context of a ratio relationship.',
  'mathematics:56:B7.1.4.1.5':'Find a percent of a quantity as a rate per 100 (e.g. 30% of a quantity means 30/100 times the quantity).',
  'mathematics:85:7.3.1.2.4':'Construct angles of 90° and 45°',
  'mathematics:86:7.3.1.2.5':'Construct angles of 60° and 30°',
  'mathematics:87:7.3.1.2.6':'Constructing angles whose measures are 15° and 75°.',
  'mathematics:100:B7.3.2.3.4':'Represent vector in the column (component) form (x; y) and determine its magnitude and direction.',
  'mathematics:101:B7.3.2.3.5':'Convert vectors in the column (component) form (x; y) to the Magnitude–Bearing form (k, θ) and vice versa',
};
const clean = s => s.replace(/\s+/g, ' ').trim();
function lines(items) {
  const groups = [];
  for (const item of [...items].sort((a,b) => b.y-a.y || a.x-b.x)) {
    if (!item.s.trim()) continue;
    let group = groups.find(g => Math.abs(g.y-item.y)<2);
    if (!group) groups.push(group = { y: item.y, items: [] });
    group.items.push(item);
  }
  return groups.sort((a,b)=>b.y-a.y).map(g => ({y:g.y, text:clean(g.items.sort((a,b)=>a.x-b.x).map(i=>i.s).join(' '))}));
}
const result = { schema_version: 1, grade: 'Basic 7', page_numbering: 'PDF pages are one-based; printed Arabic page labels are recorded separately.',
  extraction_method: 'PDF.js positioned text; column-separated rows; source spellings/codes retained. Text extraction does not reproduce diagrams or mathematical layout; consult linked PDF.',
  policy: 'One entry per printed indicator row, including duplicate/malformed codes. Whitespace is collapsed only in official_code. No inferred replacement codes, objectives, assessments, or translations.', subjects: [] };
const validation = { schema_version: 1, checks: [], subjects: [], limitations: ['HTTP retrieval does not provide TLS authentication.', 'No independent pedagogical/editorial review or database/browser verification.', 'Figures, equations and visual task layouts remain authoritative in the PDF; plain text is not a replacement.'] };
const check = (name, condition) => { assert.ok(condition, name); validation.checks.push({name, passed:true}); };
for (const doc of manifest.documents) {
  const c = configs[doc.id];
  const bytes = readFileSync(doc.local_path);
  check(`${doc.id}: original PDF checksum`, createHash('sha256').update(bytes).digest('hex') === doc.sha256);
  const task = getDocument({data:new Uint8Array(bytes), useSystemFonts:true, isEvalSupported:false});
  const pdf = await task.promise;
  const pages = [];
  for(let n=1;n<=pdf.numPages;n++) {
    const p=await pdf.getPage(n), content=await p.getTextContent();
    pages.push({pdf_page:n, items:content.items.filter(i=>'str' in i).map(i=>({s:i.str,x:i.transform[4],y:i.transform[5]}))});
  }
  check(`${doc.id}: Basic 7 divider`, pages[c.first-2].items.some(i=>i.s.trim()==='BASIC 7'));
  check(`${doc.id}: Basic 8 boundary excluded`, pages[c.last].items.some(i=>i.s.trim()==='BASIC 8'));
  const subject = { id:doc.id, subject:doc.subject, document_id:doc.id, source_sha256:doc.sha256,
    basic7_pdf_pages:[c.first,c.last], printed_pages:[2,c.last-c.offset], headings:[], content_standards:[], indicators:[], assessment_expectations:[] };
  let strand=null, sub=null, standard=null, current=null;
  const standards = new Map();
  for(const page of pages.slice(c.first-1,c.last)) {
    const headerItems=page.items.filter(i=>/^\s*(?:SUB[- ]?STRAND|STRAND)\b/i.test(i.s));
    const middle=c.middle;
    const coreHeading=page.items.find(i=>/^CORE COMPETENCIES$/.test(i.s.trim()));
    const right=doc.id==='science'&&coreHeading?Math.min(c.right,coreHeading.x-3):c.right;
    check(`${doc.id}: printed label on PDF page ${page.pdf_page}`,page.items.some(i=>i.y<50&&i.s.trim()===String(page.pdf_page-c.offset)));
    const headingYs=headerItems.map(i=>i.y);
    const isBody=i=>i.y>c.footer && !/^(?:CONTENT(?: STANDARD)?|STANDARD|INDICATORS AND EXEMPLAR.*|CORE(?: COMPETENCIES.*)?|SUBJECT SPECIFIC PRACTICES)$/.test(i.s.trim()) && !headingYs.some(y=>Math.abs(i.y-y)<2);
    const cells=page.items.filter(isBody);
    const events=[...headerItems.map(i=>({kind:/^\s*SUB/i.test(i.s)?'sub':'strand',item:i})),
      ...cells.filter(i=>codeStart.test(i.s.trim())).map(i=>({kind:i.x<middle?'standard':i.x<right?'indicator':'reference',item:i}))]
      .filter(e=>e.kind!=='reference').sort((a,b)=>Math.abs(b.item.y-a.item.y)<16?a.item.x-b.item.x:b.item.y-a.item.y);
    // Only code-first text at the indicator column edge denotes a new row. Embedded references do not.
    const indicatorEvents=events.filter(e=>e.kind==='indicator' && e.item.x<middle+75);
    for(const event of events) {
      const i=event.item;
      if(event.kind==='strand'||event.kind==='sub') {
        const headingLine=lines(page.items.filter(j=>Math.abs(j.y-i.y)<2)).map(l=>l.text).join(' ');
        const h={kind:event.kind==='sub'?'sub_strand':'strand',official_heading:headingLine,pdf_page:page.pdf_page,printed_page:String(page.pdf_page-c.offset)};
        subject.headings.push(h);
        if(event.kind==='strand') strand=h; else sub=h;
        continue;
      }
      const raw=codeStart.exec(i.s.trim())[0], official=raw.replace(/\s+/g,'');
      if(event.kind==='standard') {
        // Repeated standard cells are retained as page evidence, not new standards.
        const lower=events.filter(e=>e.kind==='standard'&&e.item.y<i.y-2).reduce((v,e)=>Math.max(v,e.item.y),c.footer);
        const text=lines(cells.filter(j=>j.x<middle&&j.y<=i.y+2&&j.y>lower+2)).map(l=>l.text).join('\n');
        if(!standards.has(official)) {
          standard={official_code:official,source_code_raw:raw,statement_raw:text,source_pages:[page.pdf_page],strand_heading:strand?.official_heading??null,sub_strand_heading:sub?.official_heading??null};
          standards.set(official,standard); subject.content_standards.push(standard);
        } else { standard=standards.get(official); if(!standard.source_pages.includes(page.pdf_page))standard.source_pages.push(page.pdf_page); }
        continue;
      }
      if(!indicatorEvents.includes(event)) continue;
      current={entry_id:`${doc.id}:pdf${page.pdf_page}:row${indicatorEvents.indexOf(event)+1}`,official_code:official,source_code_raw:raw,
        content_standard_code_as_printed:standard?.official_code??null, strand_heading:strand?.official_heading??null,sub_strand_heading:sub?.official_heading??null,
        pdf_page:page.pdf_page,printed_page:String(page.pdf_page-c.offset), source_pages:[],indicator_statement:'',source_cell_text:'',core_competencies_text:'',flags:[]};
      subject.indicators.push(current);
    }
    // Assign body bands to rows, including continuation pages before the first new code.
    const preceding = subject.indicators.filter(r=>r.pdf_page<page.pdf_page).at(-1);
    const rows=indicatorEvents.map(e=>({event:e,row:subject.indicators.find(r=>r.pdf_page===page.pdf_page&&r.source_code_raw===codeStart.exec(e.item.s.trim())[0]&&r.entry_id.endsWith(`row${indicatorEvents.indexOf(e)+1}`))}));
    const bands=[];
    if(preceding)bands.push({row:preceding,top:Infinity,bottom:rows[0]?rows[0].event.item.y+2:c.footer});
    for(let k=0;k<rows.length;k++)bands.push({row:rows[k].row,top:rows[k].event.item.y+2,bottom:rows[k+1]?rows[k+1].event.item.y+2:c.footer});
    for(const band of bands){
      const selected=cells.filter(j=>j.y<=band.top&&j.y>band.bottom&&j.x>=middle&&j.x<right);
      const selectedLines=lines(selected);
      const text=selectedLines.map(l=>l.text).join('\n');
      if(!text)continue;
      const r=band.row;r.source_pages.push(page.pdf_page);r.source_cell_text+=(r.source_cell_text?'\n':'')+text;
      if(r.pdf_page===page.pdf_page){
        const firstParagraph=[];
        for(const l of selectedLines){
          if(firstParagraph.length&&(firstParagraph.at(-1).y-l.y>(doc.id==='english'?17:21)||/^(?:[•]|\d+[.)]\s|[ivx]+[.)]\s|E\s*\.\s*g\s*\.|Exemplars?)/i.test(l.text)))break;
          firstParagraph.push(l);
        }
        r.indicator_statement=firstParagraph.map(l=>l.text).join(' ');
      }
      const core=lines(cells.filter(j=>j.y<=band.top&&j.y>band.bottom&&j.x>=right)).map(l=>l.text).join('\n');
      r.core_competencies_text+=(r.core_competencies_text?'\n':'')+core;
    }
  }
  // Derive a statement only up to explicit exemplar/bullet markers. Full cell text remains alongside it.
  for(const r of subject.indicators){
    let text=r.indicator_statement.replace(codeStart,'').replace(/^[\s.:-]+/,'');
    const stop=text.search(/Exemplars?(?:\(s\))?\s*:?|[•]/i);
    r.indicator_statement=clean(stop>=0?text.slice(0,stop):text);
    const visual=visualStatements[`${doc.id}:${r.pdf_page}:${r.official_code}`];
    r.statement_transcription_method=visual?'visual_source_transcription_with_linearised_mathematical_notation':'positioned_PDF_text_first_paragraph';
    if(visual){r.indicator_statement=visual;r.flags.push('visual_transcription_consult_PDF_for_equation_layout');}
    if(!/^B7(?:\.\d+){4}$/.test(r.official_code))r.flags.push('nonstandard_printed_indicator_code_no_replacement_inferred');
    if(!r.content_standard_code_as_printed)r.flags.push('missing_explicit_standard');
    if(/^B7(?:\.\d+){4}$/.test(r.official_code)&&r.content_standard_code_as_printed?.replace(/^B\.7/,'B7')!==r.official_code.split('.').slice(0,-1).join('.'))r.flags.push('indicator_prefix_differs_from_displayed_standard');
    const duplicates=subject.indicators.filter(q=>q.official_code===r.official_code);
    if(duplicates.length>1)r.flags.push('duplicate_printed_code_distinct_rows_preserved');
    if(!r.indicator_statement)r.flags.push('unreadable_or_missing_statement');
    if(doc.id==='english'&&r.official_code.startsWith('B7.3.4.')){r.flags.push('no_separate_sub_strand_4_heading_in_Basic7_table');r.preceding_sub_strand_heading=r.sub_strand_heading;r.sub_strand_heading=null;}
    if(doc.id==='english'&&r.official_code.startsWith('B7.4.1.'))r.flags.push('source_sub_strand_heading_ends_with_PRODUCTION_AND');
    check(`${r.entry_id}: exact printed code on referenced PDF page`,pages[r.pdf_page-1].items.some(i=>i.s.includes(r.source_code_raw)));
    check(`${r.entry_id}: nonempty statement and cell`,Boolean(r.indicator_statement&&r.source_cell_text));
  }
  for(const st of subject.content_standards){
    st.flags=[];
    if(!/^B7(?:\.\d+){3}$/.test(st.official_code))st.flags.push('nonstandard_printed_standard_code_no_replacement_inferred');
    if(doc.id==='english'&&st.official_code==='B7.3.4.1'){st.preceding_sub_strand_heading=st.sub_strand_heading;st.sub_strand_heading=null;st.flags.push('no_separate_sub_strand_4_heading_in_Basic7_table');}
  }
  for(let n=c.assessment[0];n<=c.assessment[1];n++) subject.assessment_expectations.push({pdf_page:n,
    printed_page:pages[n-1].items.find(i=>i.y<50&&/^(?:[ivxlcdm]+|\d+)$/.test(i.s.trim()))?.s.trim()??null,
    source_text_raw:pages[n-1].items.map(i=>i.s).join(' ').replace(/\s+/g,' ').trim(),
    note:'Official assessment guidance, extracted in PDF text order; multi-column tables/figures must be read in the source PDF. Per-indicator performance expectations are in source_cell_text, including original exemplars; no new assessment is authored.'});
  const count={indicator_rows:subject.indicators.length,distinct_printed_codes:new Set(subject.indicators.map(r=>r.official_code)).size,
    flagged_rows:subject.indicators.filter(r=>r.flags.length).length,content_standard_codes:subject.content_standards.length};
  subject.counts=count;
  // Independent enumeration of code-first indicator text detects dropped rows, including malformed codes.
  const sourceRows=pages.slice(c.first-1,c.last).flatMap(p=>{
    const left=c.middle;
    return p.items.filter(i=>i.y>c.footer&&i.x>=left&&i.x<left+75&&codeStart.test(i.s.trim()));
  });
  check(`${doc.id}: all code-first indicator rows covered`,sourceRows.length===subject.indicators.length);
  check(`${doc.id}: all source pages within Basic 7`,subject.indicators.every(r=>r.source_pages.every(n=>n>=c.first&&n<=c.last)));
  doc.title_as_printed=clean(pages[0].items.map(i=>i.s).join(' '));
  doc.title=`${doc.subject} Common Core Programme (CCP)${doc.id==='english'?'':' — Curriculum for JHS 1 (B7)–JHS 3 (B9)'}`;
  doc.publisher='National Council for Curriculum and Assessment (NaCCA), Ministry of Education, Republic of Ghana';
  doc.applicable_grades=['Basic 7 (JHS 1)','Basic 8 (JHS 2)','Basic 9 (JHS 3)'];
  doc.grade_range_evidence={pdf_pages:doc.id==='mathematics'?[1]:[1,2],note:doc.id==='english'?'Cover repeats COMMON CORE PROGRAMME; B7–B9 applicability is explicit on imprint page 2.':doc.id==='mathematics'?'JHS 1 (B7)–JHS 3 (B9) is explicit on cover.':'JHS 1 (B7)–JHS 3 (B9) is explicit on cover and imprint.'};
  doc.edition_information={cover_publication_date:'September 2020',cover_pdf_page:1,
    imprint_copyright:'2020',imprint_pdf_page:2,imprint_verification:doc.id==='mathematics'?'Visually verified: copyright text is present in the rendered imprint although absent from extracted text.':'Extracted text and rendered imprint checked.',
    body_footer_copyright:doc.id==='mathematics'?'No copyright footer identified in Basic 7 tables':'2021',
    interpretation:'No numbered edition claimed. Cover date, imprint copyright, body footer and HTTP modification timestamp are distinct evidence; upload year is not the edition.'};
  doc.pdf_page_count=pdf.numPages;doc.basic7_pdf_pages=[c.first,c.last];doc.counts=count;
  doc.verification_status='official_index_link_and_document_contents_checked_HTTP_transport_limitation';
  doc.identity_evidence=[1,2].map(n=>({pdf_page:n,text:clean(pages[n-1].items.map(i=>i.s).join(' '))}));
  doc.pdf_metadata=(await pdf.getMetadata()).info;
  validation.subjects.push({subject:doc.subject,...count,all_indicator_rows_accounted_for:true});
  result.subjects.push(subject);
  await task.destroy();
}
const csvFields=['subject','entry_id','official_code','source_code_raw','strand_heading','sub_strand_heading','content_standard_code_as_printed','indicator_statement','document_path','source_url','sha256','pdf_page','printed_page','continuation_pdf_pages','flags'];
const csvCell=x=>'"'+String(x??'').replaceAll('"','""')+'"';
const csv=[csvFields.map(csvCell).join(',')];
for(const s of result.subjects){const d=manifest.documents.find(d=>d.id===s.id);for(const r of s.indicators){const row={...r,subject:s.subject,document_path:d.local_path,source_url:d.source_url,sha256:d.sha256,continuation_pdf_pages:r.source_pages.join(';'),flags:r.flags.join(';')};csv.push(csvFields.map(f=>csvCell(row[f])).join(','));}}
manifest.extraction_artifacts={structure:`${directory}/basic7-curriculum-structure.json`,coverage_matrix:`${directory}/basic7-coverage-matrix.csv`,validation:`${directory}/basic7-validation.json`};
validation.completed_at_utc=new Date().toISOString();validation.check_count=validation.checks.length;
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
writeFileSync(`${directory}/basic7-curriculum-structure.json`,JSON.stringify(result,null,2)+'\n');
writeFileSync(`${directory}/basic7-coverage-matrix.csv`,csv.join('\n')+'\n');
writeFileSync(`${directory}/basic7-validation.json`,JSON.stringify(validation,null,2)+'\n');
console.log(JSON.stringify({checks:validation.check_count,subjects:validation.subjects},null,2));

// Read-only verification of the saved documentation artifacts; no application/database dependencies.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const dir='docs/curriculum-sources/ghana/ccp-b7-b9';
const json=name=>JSON.parse(readFileSync(`${dir}/${name}`,'utf8'));
const manifest=json('basic7-source-manifest.json'), structure=json('basic7-curriculum-structure.json'), validation=json('basic7-validation.json');
const expected={english:[53,53],mathematics:[74,74],computing:[55,52],science:[53,53]};
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
// RFC 4180 quoted CSV parser: handles embedded commas, newlines and doubled quote characters.
function parseCsv(text){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"') {if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(!quoted&&(c===','||c==='\n')){row.push(cell);cell='';if(c==='\n'){rows.push(row);row=[];}}
    else if(c!=='\r'||quoted)cell+=c;
  }
  check(!quoted,'CSV closes all quoted cells');
  if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
const [header,...cells]=parseCsv(readFileSync(`${dir}/basic7-coverage-matrix.csv`,'utf8'));
check(cells.every(r=>r.length===header.length),'CSV column counts');
const matrix=cells.map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]])));
check(manifest.documents.length===4&&structure.subjects.length===4,'Exactly four subjects');
check(matrix.length===235,'235 indicator entries, including conflicting source codes');
check(new Set(matrix.map(r=>r.entry_id)).size===235,'Unique source-entry identities');
check(validation.checks.length===validation.check_count&&validation.checks.every(c=>c.passed),'Extraction checks all passed');
const seenHashes=new Set();
for(const doc of manifest.documents){
  const bytes=readFileSync(doc.local_path),hash=createHash('sha256').update(bytes).digest('hex');
  check(bytes.subarray(0,5).toString()==='%PDF-','PDF magic');
  check(hash===doc.sha256&&bytes.length===doc.bytes,`${doc.id}: source bytes/checksum`);
  check(!seenHashes.has(hash),'No duplicate official PDF content');seenHashes.add(hash);
  check(new URL(doc.source_url).hostname==='nacca.gov.gh','Official source host');
  check(doc.title&&doc.publisher&&doc.applicable_grades.length===3&&doc.edition_information.cover_publication_date==='September 2020','Identity and edition evidence');
  check(!doc.verification_status.includes('pending'),'Content review finished');
  const s=structure.subjects.find(s=>s.id===doc.id),rows=matrix.filter(r=>r.subject===doc.subject);
  check(s.indicators.length===expected[doc.id][0]&&new Set(s.indicators.map(r=>r.official_code)).size===expected[doc.id][1],`${doc.id}: reviewed counts`);
  check(rows.length===s.indicators.length&&doc.counts.indicator_rows===rows.length,'Manifest/structure/matrix counts agree');
  check(s.source_sha256===hash,'Structure linked to exact PDF');
  check(s.assessment_expectations.length>=4&&s.assessment_expectations.every(a=>a.source_text_raw&&a.pdf_page>0&&a.printed_page),'Assessment guidance page references');
  for(const r of s.indicators){
    const m=rows.find(m=>m.entry_id===r.entry_id);
    check(Boolean(m),'Every structured entry represented in matrix');
    check(m.official_code===r.official_code&&m.source_code_raw===r.source_code_raw&&m.indicator_statement===r.indicator_statement,'Printed code and statement round-trip');
    check(m.sha256===hash&&m.document_path===doc.local_path&&m.source_url===doc.source_url,'Each row points to the pinned official PDF');
    check(Number(m.pdf_page)===r.pdf_page&&m.printed_page===r.printed_page,'PDF and printed page labels agree');
    check(r.source_pages.includes(r.pdf_page)&&r.source_pages.every(n=>n>=s.basic7_pdf_pages[0]&&n<=s.basic7_pdf_pages[1]),'Continuation pages stay inside Basic 7');
    check(Boolean(r.indicator_statement&&r.source_cell_text&&r.strand_heading&&r.content_standard_code_as_printed),'Required source information readable');
    check(s.content_standards.some(st=>st.official_code===r.content_standard_code_as_printed),'Explicit displayed content standard exists');
    check(/^B7(?:\.\d+){4}$/.test(r.official_code)||r.flags.includes('nonstandard_printed_indicator_code_no_replacement_inferred'),'Malformed source codes explicitly flagged');
    check(!/Critical Thinking and|Communication and Collaboration|DL5\.3|\uFFFD/.test(r.indicator_statement),'No known adjacent-column/replacement-glyph contamination in indicator statement');
    check(r.sub_strand_heading||r.flags.includes('no_separate_sub_strand_4_heading_in_Basic7_table'),'Missing heading explicitly flagged');
  }
}
check(readdirSync(dir).filter(p=>p.toLowerCase().endsWith('.pdf')).length===4,'Exactly four source PDFs in this directory');
console.log(JSON.stringify({passed:true,saved_artifact_checks:checks,source_extraction_checks:validation.check_count,total_indicator_entries:matrix.length,subjects:validation.subjects},null,2));

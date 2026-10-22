import fs from 'node:fs';
const out = 'docs/audits/basic4-6-completion/reconciliation';
const clean = s => s.replace(/\s+/g, ' ').trim();
const config = { english: { start: 26, boundary: 175, right: 590 }, mathematics: { start: 23, boundary: 150, right: 640 }, science: { start: 24, boundary: 180, right: 580 }, computing: { start: 23, boundary: 160, right: 568 } };
const records = [], standards = [], headings = [], anomalies = [];
const codePattern = /^(?:[BP]\s*\.?\s*[456](?:\s*\.\s*\d+){2,6}|\d+(?:\s*\.\s*\d+){3,4})(?!\d)/;
for (const [subject, cfg] of Object.entries(config)) {
  const pages = JSON.parse(fs.readFileSync(`${out}/${subject}-pages.json`, 'utf8'));
  let grade = 4, strand = null, subStrand = null, previousStandard = null;
  for (const page of pages.filter(p => p.page >= cfg.start)) {
    const gradeLine = page.lines.find(l => l.y < 140 && /^(BASIC|PRIMARY)\s*[456]$/i.test(l.text));
    if (gradeLine) { grade = Number(gradeLine.text.match(/[456]/)[0]); strand = subStrand = previousStandard = null; }
    const rightXs = page.lines.filter(l => l.y > 100 && l.y < page.height - 65).flatMap(l => l.items.filter(i => i.x > 500 && /^(?:\d+\.\s*)?(?:Learners develop:|Core Competenc|Communication|Creativity|Critical Thinking|Subject Specific Practices|Cultural Identity|Personal Development|Digital Literacy|Reading and Writing|Listening and Speaking|Problem Solving Skills)/i.test(i.text)).map(i => i.x));
    const right = rightXs.length ? Math.min(...rightXs) - 2 : cfg.right;
    const pageStandards = [];
    for (const line of page.lines) {
      const left = line.items.filter(i => i.x < cfg.boundary).map(i => i.text).join(' ');
      const match = clean(left).match(codePattern);
      if (match && /^[BP]/.test(match[0])) pageStandards.push({ code: match[0].replace(/\s+/g, ''), rawCode: match[0], y: line.y, page: page.page, text: clean(left.slice(match[0].length)), subject, grade });
    }
    standards.push(...pageStandards);
    const indicatorXs = page.lines.flatMap(l => l.items.filter(i => i.x >= cfg.boundary && i.x < 335 && codePattern.test(i.text.trim())).map(i => i.x));
    const firstIndicatorX = Math.min(...indicatorXs);
    const printedPage = page.lines.filter(l => l.y > page.height - 90 && /^\d+$/.test(l.text)).at(-1)?.text ?? null;
    let active = null;
    for (const line of page.lines.filter(l => l.y < page.height - 45)) {
      const st = line.text.match(/^STRAND\s*(\d+)\s*[:.\-]\s*(.+)/i), su = line.text.match(/(?:^|\s)SUB[ -]?STRAND\s*(\d+)\s*[:.\-]\s*(.+)/i);
      if (st) { strand = { number: +st[1], title: st[2].split(/SUB[ -]?STRAND/i)[0].trim(), page: page.page }; subStrand = null; headings.push({ subject, grade, kind: 'strand', ...strand }); }
      if (su) { subStrand = { number: +su[1], title: su[2], page: page.page }; headings.push({ subject, grade, kind: 'sub_strand', ...subStrand }); }
      if (st || su) { active = null; continue; }
      if (line.y > page.height - 90 && /^\d+$/.test(line.text)) continue;
      const codeIndex = line.items.findIndex(i => i.x >= cfg.boundary && i.x < 335 && codePattern.test(i.text.trim()));
      let codeItem = line.items[codeIndex];
      if (codeItem && /^\d/.test(codeItem.text.trim()) && /^[BP]$/.test(line.items[codeIndex - 1]?.text.trim() ?? '')) codeItem = line.items[codeIndex - 1];
      const middleItems = line.items.filter(i => i.x >= (codeItem?.x ?? cfg.boundary) && i.x < right);
      const middle = clean(middleItems.map(i => i.text).join(' '));
      const match = middle.match(codePattern);
      if (match && middleItems[0].x < 335 && middleItems[0].x <= firstIndicatorX + 25 && !/^\s*\)/.test(middle.slice(match[0].length))) {
        const nearest = pageStandards.filter(s => s.y <= line.y + 7).at(-1) ?? previousStandard;
        active = { id: `${subject}:b${grade}:pdf${page.page}:y${Math.round(line.y)}`, subject, grade, code: match[0].replace(/\s+/g, ''), rawCode: match[0],
          pdfPage: page.page, printedPage, y: line.y, x: middleItems[0].x,
          tableContentStandard: nearest?.code ?? null, tableStandardText: nearest?.text ?? null,
          strand, subStrand, firstLine: middle, statementLines: [clean(middle.slice(match[0].length).replace(/^\./, ''))], blockLines: [middle], stopped: false };
        records.push(active);
      } else if (active && middle && line.y > active.y) {
        if (/^(?:[•●▪]|E\.?g\.?\b|Exemplar|Example|\(?[ivx]+\)|[123456789]\.|Bring |Guide |Assist |Ask |Let |Take |Teacher |Teachers |Engage |Put |Learners? |NB:)/i.test(middle.replace(/^\.\s*/, ''))) active.stopped = true;
        if (!active.stopped && !/CONTENT|STANDARDS|INDICATORS|PRACTICES|COMPETENCIES/.test(middle)) active.statementLines.push(middle);
        active.blockLines.push(middle);
      }
      // Reflective Writing is an uncoded source activity under a numbered standard.
      if (subject === 'english' && page.page === 227 && middle === 'Reflective Writing') {
        const nearest = pageStandards.filter(s => s.y <= line.y + 7).at(-1);
        active = { id: 'english:b6:pdf227:uncoded-reflective-writing', subject, grade, code: null, rawCode: null, pdfPage: page.page,
          printedPage, y: line.y, x: middleItems[0].x, tableContentStandard: nearest?.code, tableStandardText: nearest?.text,
          strand, subStrand, firstLine: middle, statementLines: [middle], blockLines: [middle], stopped: false, review: 'uncoded source activity; do not invent an indicator code' };
        records.push(active);
      }
    }
    previousStandard = pageStandards.at(-1) ?? previousStandard;
  }
}
for (const r of records) {
  r.statement = clean(r.statementLines.join(' ')); r.activityBlock = clean(r.blockLines.join(' '));
  delete r.statementLines; delete r.blockLines; delete r.stopped;
  const parts = r.code?.split('.') ?? [];
  r.sourceFlags = [];
  if (!r.strand || !r.subStrand) r.sourceFlags.push('source_heading_not_extracted_do_not_invent_title');
  if (!r.code) r.sourceFlags.push('uncoded_source_activity');
  else {
    if (!/^B[456]\./.test(r.code)) r.sourceFlags.push('nonstandard_grade_prefix');
    if (parts.length !== 5) r.sourceFlags.push('nonstandard_indicator_code_length');
    if (Number(r.code.match(/[456]/)?.[0]) !== r.grade) r.sourceFlags.push('printed_grade_differs_from_section');
    if (r.tableContentStandard && parts.slice(0, -1).join('.') !== r.tableContentStandard) r.sourceFlags.push('printed_prefix_differs_from_table_standard');
  }
  if (r.sourceFlags.length) anomalies.push({ id: r.id, code: r.code, grade: r.grade, subject: r.subject, pdfPage: r.pdfPage, statement: r.statement, tableContentStandard: r.tableContentStandard, flags: r.sourceFlags });
}
fs.writeFileSync(`${out}/positioned-indicator-occurrences.json`, JSON.stringify(records, null, 2) + '\n');
fs.writeFileSync(`${out}/positioned-standards.json`, JSON.stringify(standards, null, 2) + '\n');
fs.writeFileSync(`${out}/source-anomalies.json`, JSON.stringify(anomalies, null, 2) + '\n');
// Independent whole-line inventory also sees references and unusually long standards.
const printedIndex = [];
for (const [subject, cfg] of Object.entries(config)) for (const page of JSON.parse(fs.readFileSync(`${out}/${subject}-pages.json`, 'utf8')).filter(p => p.page >= cfg.start)) for (const line of page.lines) {
  for (const match of line.text.matchAll(/[BP]\s*\.?\s*[456](?:\s*\.\s*\d+){4,6}/g)) {
    const code = match[0].replace(/\s/g, '');
    const represented = records.some(r => r.subject === subject && r.code === code);
    const disposition = represented ? 'represented_indicator_code' : subject === 'computing' && code === 'B5.6.4.9.1' && page.page === 48
      ? 'printed_table_content_standard_not_learning_indicator'
      : subject === 'mathematics' && code === 'P6.5.2.2.3' && page.page === 178
        ? 'unresolved_printed_inline_cross_reference_not_an_indicator_declaration' : 'unresolved_extraction_requires_review';
    printedIndex.push({ subject, pdfPage: page.page, y: line.y, code, rawCode: match[0], line: line.text, representedInIndicatorInventory: represented, disposition });
  }
}
fs.writeFileSync(`${out}/independent-printed-code-index.json`, JSON.stringify({ occurrences: printedIndex, notInIndicatorInventory: printedIndex.filter(r => !r.representedInIndicatorInventory) }, null, 2) + '\n');
console.log(JSON.stringify({ occurrences: records.length, anomalies: anomalies.length, groups: [4,5,6].flatMap(grade => Object.keys(config).map(subject => ({ grade, subject,
  occurrences: records.filter(r => r.grade === grade && r.subject === subject).length,
  uniquePrintedCodes: new Set(records.filter(r => r.grade === grade && r.subject === subject && r.code).map(r => r.code)).size,
  uncoded: records.filter(r => r.grade === grade && r.subject === subject && !r.code).length }))) }, null, 2));

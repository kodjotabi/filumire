import fs from 'node:fs';
import assert from 'node:assert/strict';
import { JHS_PREVIEW_SOURCES, JHS_REPRESENTATIVE_CONTENT } from '../services/content-store/jhs-representative-preview';
const output = 'docs/jhs-development';
const read = (file: string) => fs.existsSync(`${output}/${file}`) ? JSON.parse(fs.readFileSync(`${output}/${file}`, 'utf8')) : [];
const journeys = read('representative-journeys.json');
const browser = read('representative-browser/results.json');
const proofs = read('preview-source-review/results.json');
const rows = [7, 8, 9].flatMap(grade => {
  const mapping = JSON.parse(fs.readFileSync(`docs/curriculum-sources/ghana/ccp-b7-b9/basic${grade}-filumire-mapping.json`, 'utf8'));
  return mapping.subjects.flatMap((subject: any) => subject.entries.map((entry: any) => {
    const id = entry.proposed_competency_id;
    const content = JHS_REPRESENTATIVE_CONTENT.filter(c => c.competencyId === id);
    const source = JHS_PREVIEW_SOURCES.find(s => s.id === id);
    const apiCases = journeys.filter((r: any) => r.competencyId === id);
    const browserCases = browser.filter((r: any) => r.competencyId === id);
    const apiValidated = apiCases.length === 4 && new Set(apiCases.map((r: any) => `${r.language}:${r.retentionOutcome}`)).size === 4 && apiCases.every((r: any) => r.passed);
    const browserValidated = browserCases.length === 4 && new Set(browserCases.map((r: any) => `${r.language}:${r.width}`)).size === 4 && browserCases.every((r: any) => r.status === 'PASS');
    return { grade, subject: subject.subject, competencyId: id, sourceEntryId: entry.entry_id, officialCodeAsPrinted: entry.source.original_printed_code,
      source: entry.source, hierarchy: entry.hierarchy ?? { strand: entry.strand, subStrand: entry.sub_strand, contentStandard: entry.content_standard },
      sourceIssueIds: entry.source_issue_ids, globalSourceIssueIds: source?.globalSourceIssueIds ?? [], numbering: entry.numbering,
      mapped: true, authoredDraft: content.length === 26, sourcePageChecked: proofs.some((p: any) => p.competencyId === id && p.printedCodeVerified),
      contentIds: content.map(c => c.id), authoredLanguages: [...new Set(content.map(c => c.language))], apiValidated, browserValidated,
      apiCases, browserCases, educatorApproved: false, frenchApproved: false, releaseApproved: false, publicActive: false,
      status: !content.length ? 'mapped_not_authored' : apiValidated && browserValidated ? 'draft_isolated_preview_validated_review_pending' : 'draft_validation_pending' };
  }));
});
assert.equal(rows.length, 625); assert.equal(new Set(rows.map(r => r.competencyId)).size, 625);
const summary = [7, 8, 9].flatMap(grade => ['English Language', 'Mathematics', 'Science', 'Computing'].map(subject => {
  const group = rows.filter(r => r.grade === grade && r.subject === subject);
  return { grade, subject, mapped: group.length, authoredDraft: group.filter(r => r.authoredDraft).length,
    apiValidated: group.filter(r => r.apiValidated).length, browserValidated: group.filter(r => r.browserValidated).length,
    remainingAuthoring: group.filter(r => !r.authoredDraft).length, releaseApproved: 0, remainingReleaseApproval: group.length };
}));
fs.writeFileSync(`${output}/preview-competency-matrix.json`, JSON.stringify({ denominator: '625 physical mapped entries; printed codes are not unique IDs', rows }, null, 2) + '\n');
fs.writeFileSync(`${output}/preview-coverage-summary.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ mapped: rows.length, authoredDraft: rows.filter(r => r.authoredDraft).length, apiValidated: rows.filter(r => r.apiValidated).length, browserValidated: rows.filter(r => r.browserValidated).length, releaseApproved: 0, summary }, null, 2));

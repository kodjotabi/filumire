import fs from 'node:fs';
import assert from 'node:assert/strict';
import { getFrameworkCompetencyRegistration } from '../packages/curriculum-framework';
import { getCcpBlockingSourceIssueIds } from '../packages/curriculum/ghana-ccp-runtime';
import { JHS_PREVIEW_SOURCES, JHS_PREVIEW_COMPETENCIES, JHS_REPRESENTATIVE_CONTENT } from '../services/content-store/jhs-representative-preview';
import { JHS_COMPLETION_BATCHES } from '../services/content-store/jhs-completion-batches';
import { jhsValidationFingerprint } from '../services/content-store/jhs-validation-fingerprint';
const directory = 'docs/jhs-development';
const read = (file: string): any[] => fs.existsSync(`${directory}/${file}`) ? JSON.parse(fs.readFileSync(`${directory}/${file}`, 'utf8')) : [];
const catalogue = [{ id: 'preserved-preview', sources: JHS_PREVIEW_SOURCES, competencies: JHS_PREVIEW_COMPETENCIES, content: JHS_REPRESENTATIVE_CONTENT,
  journeys: read('representative-journeys.json'), browser: read('representative-browser/results.json'), proofs: read('preview-source-review/results.json') },
  ...JHS_COMPLETION_BATCHES.map(b => ({ ...b, journeys: read(`completion/${b.id}/journeys.json`), browser: read(`completion/${b.id}/browser/results.json`), proofs: read(`completion/${b.id}/source-review/results.json`) }))];
const authored = catalogue.flatMap(b => b.sources.map(s => s.id)); assert.equal(new Set(authored).size, authored.length, 'No duplicated authoring between batches');
const rows = [7, 8, 9].flatMap(grade => {
  const mapping = JSON.parse(fs.readFileSync(`docs/curriculum-sources/ghana/ccp-b7-b9/basic${grade}-filumire-mapping.json`, 'utf8'));
  return mapping.subjects.flatMap((subject: any) => subject.entries.map((entry: any) => {
    const id = entry.proposed_competency_id, source = getFrameworkCompetencyRegistration(id)!;
    assert(source, `Missing registration ${id}`);
    const batch = catalogue.find(b => b.sources.some(s => s.id === id));
    const definition = batch?.competencies.find(c => c.id === id);
    const records = batch?.content.filter(c => c.competencyId === id) ?? [];
    const fingerprint = definition && batch ? jhsValidationFingerprint(definition, records) : null;
    const apiCases = batch?.journeys.filter(r => r.competencyId === id && r.contentFingerprint === fingerprint) ?? [];
    const browserCases = batch?.browser.filter(r => r.competencyId === id && r.contentFingerprint === fingerprint) ?? [];
    const apiValidated = apiCases.length === 4 && new Set(apiCases.map(r => `${r.language}:${r.retentionOutcome}`)).size === 4 && apiCases.every(r => r.passed);
    const browserValidated = browserCases.length === 4 && new Set(browserCases.map(r => `${r.language}:${r.width}`)).size === 4 && browserCases.every(r => r.status === 'PASS');
    const sourceVerified = batch?.proofs.some(p => p.competencyId === id && p.sha256 === source.source.sha256 && p.printedCodeVerified) ?? false;
    const blockingSourceIssues = getCcpBlockingSourceIssueIds(source.sourceIssueIds);
    return { grade, subject: subject.subject, competencyId: id, officialCodeAsPrinted: source.officialCode, sourceEntryId: source.sourceEntryId,
      source: source.source, hierarchy: source.hierarchy, sourceIssueIds: source.sourceIssueIds, globalSourceIssueIds: source.globalSourceIssueIds,
      numbering: source.numbering, mappingReview: source.review, blockingSourceIssues, batch: batch?.id ?? null,
      authoredDraft: records.length === 26, contentIds: records.map(c => c.id), contentFingerprint: fingerprint,
      apiValidated, browserValidated, sourcePageChecked: sourceVerified, technicallyValidated: records.length === 26 && sourceVerified && apiValidated && browserValidated,
      apiCases, browserCases, educatorApproved: false, frenchApproved: false, releaseApproved: false, publicActive: false,
      status: records.length ? apiValidated && browserValidated && sourceVerified ? 'draft_technically_validated_human_review_pending' : 'draft_validation_pending' : blockingSourceIssues.length ? 'not_authored_source_review_required' : 'not_authored' };
  }));
});
assert.equal(rows.length, 625); assert.equal(new Set(rows.map(r => r.competencyId)).size, 625);
const summary = [7, 8, 9].flatMap(grade => ['English Language', 'Mathematics', 'Science', 'Computing'].map(subject => {
  const group = rows.filter(r => r.grade === grade && r.subject === subject);
  return { grade, subject, mapped: group.length, authoredDraft: group.filter(r => r.authoredDraft).length,
    technicallyValidated: group.filter(r => r.technicallyValidated).length, remainingAuthoring: group.filter(r => !r.authoredDraft).length,
    unresolvedSourceRows: group.filter(r => r.blockingSourceIssues.length).length, releaseApproved: 0, publicActive: 0 };
}));
fs.mkdirSync(`${directory}/completion`, {recursive:true});
fs.writeFileSync(`${directory}/completion/competency-matrix.json`, JSON.stringify({ denominator: '625 physical mapped source entries; unique internal IDs distinguish repeated printed codes', validationPolicy: 'Exact content/competency fingerprints; four API and four browser cases per indicator. Technical fixtures confer no educator approval.', rows }, null, 2) + '\n');
fs.writeFileSync(`${directory}/completion/coverage-summary.json`, JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ mapped: 625, authoredDraft: rows.filter(r => r.authoredDraft).length, technicallyValidated: rows.filter(r => r.technicallyValidated).length,
  remainingAuthoring: rows.filter(r => !r.authoredDraft).length, unresolvedSourceRows: rows.filter(r => r.blockingSourceIssues.length).length, releaseApproved:0, summary }, null, 2));

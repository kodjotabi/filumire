// Deterministic source-registry generation. No runtime content, lessons or activation.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const base = 'docs/curriculum-sources/ghana/ccp-b7-b9';
const inputNames = ['basic7-filumire-mapping.json', 'basic7-mapping-source-issues.json', 'basic7-curriculum-structure.json', 'basic7-source-manifest.json'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inputs = Object.fromEntries(inputNames.map(name => [name, JSON.parse(readFileSync(`${base}/${name}`, 'utf8'))]));
const mapping = inputs[inputNames[0]], issues = inputs[inputNames[1]].issues, original = inputs[inputNames[2]], manifest = inputs[inputNames[3]];
const versionId = mapping.proposed_context.curriculum_version_id;
const gradeId = mapping.proposed_context.grade_and_runtime_level_id;
const nodes = new Map(), competencies = [], subjects = [];
for (const doc of manifest.documents) assert.equal(hash(readFileSync(doc.local_path)), doc.sha256, 'Official PDF changed');
for (const subject of mapping.subjects) {
  subjects.push({ id: subject.proposed_subject_id, gradeId, name: subject.subject, code: `GH-B7-${subject.id.toUpperCase()}`, discipline: subject.id });
  const sourceRows = original.subjects.find(s => s.id === subject.id).indicators;
  for (const [index, row] of subject.entries.entries()) {
    const source = { documentId: row.source.document_id, localPath: row.source.path, url: row.source.url, sha256: row.source.sha256, pdfPages: row.source.continuation_pdf_pages, printedPage: row.source.printed_page };
    for (const [kind, field, parent] of [
      ['strand', row.strand, undefined],
      ['sub_strand', row.sub_strand, row.strand.proposed_node_id],
      ['content_standard', row.content_standard, row.sub_strand.proposed_node_id],
      ['learning_indicator', { proposed_node_id: row.proposed_learning_indicator_node_id, official_code: row.source.original_printed_code, title: row.learning_indicator.statement, source_pdf_pages: source.pdfPages }, row.content_standard.proposed_node_id],
    ]) {
      const { printedPage: _printedPage, ...documentSource } = source;
      const pageSource = { ...documentSource, pdfPages: field.source_pdf_pages };
      if (!nodes.has(field.proposed_node_id)) nodes.set(field.proposed_node_id, {
        id: field.proposed_node_id, subjectId: subject.proposed_subject_id, parentNodeId: parent, nodeType: kind,
        // Hierarchy structural keys are not official printed codes. Only explicit printed codes populate code.
        ...(field.official_code ? { code: field.official_code } : {}),
        title: field.title ?? field.nonofficial_placeholder,
        sourceReference: `${source.localPath}#page=${pageSource.pdfPages[0] ?? row.source.pdf_page}; sha256=${source.sha256}`,
        order: index + 1, source: pageSource, officialTitle: field.title,
        ...(field.structural_key ? { structuralKey: field.structural_key } : {}),
        ...(field.title === null ? { reviewFlags: ['missing_official_sub_strand_title'], officialTitle: null } : {}),
      });
    }
    competencies.push({
      id: row.proposed_competency_id, curriculumVersionId: versionId, gradeId, subjectId: subject.proposed_subject_id,
      curriculumNodeId: row.proposed_learning_indicator_node_id, title: row.learning_indicator.statement,
      registrationStatus: 'proposed', learnerVisibility: 'hidden', officialCode: row.source.original_printed_code,
      sourceEntryId: row.entry_id, source, hierarchy: { strandId: row.strand.proposed_node_id, subStrandId: row.sub_strand.proposed_node_id, contentStandardId: row.content_standard.proposed_node_id },
      numbering: row.numbering, mappingStatus: row.mapping_status, sourceIssueIds: row.source_issue_ids,
      // Global issues also apply to otherwise unflagged mappings.
      globalSourceIssueIds: issues.filter(i => i.status === 'unresolved' && i.affected_entries.length === 0 && (i.subject === 'all' || i.subject === subject.id)).map(i => i.id),
      review: row.review, phase8aReviewFlags: sourceRows.find(r => r.entry_id === row.entry_id).flags,
      assessmentRequirements: row.assessment_requirements,
      activitySourceReference: `${base}/basic7-filumire-mapping.json#entry_id=${row.entry_id}`,
    });
  }
}
assert.equal(competencies.length, 235);
assert.equal(new Set(competencies.map(c => c.id)).size, 235);
assert.equal(nodes.size, 400);
const registry = {
  inputHashes: Object.fromEntries(inputNames.map(name => [`${base}/${name}`, hash(readFileSync(`${base}/${name}`))])),
  versionId, gradeId, phaseId: mapping.proposed_context.phase_id,
  subjects, nodes: [...nodes.values()], competencies, sourceIssues: issues,
};
const serialized = JSON.stringify(registry, null, 2) + '\n';
const target = 'packages/curriculum-framework/ghana-b7-ccp-data.json';
if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8'), serialized, 'Generated Basic 7 registry is stale');
else writeFileSync(target, serialized);
console.log(`PASS Basic 7 source registry: ${competencies.length} proposed competencies, ${nodes.size} hierarchy nodes${process.argv.includes('--check') ? ' (generation matches)' : ''}`);

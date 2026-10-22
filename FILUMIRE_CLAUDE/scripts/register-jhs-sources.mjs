import fs from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const read = p => fs.readFileSync(new URL(p, root));
const subjects = [], nodes = new Map(), competencies = [], inputs = {};
const issueFile = 'docs/curriculum-sources/ghana/ccp-b7-b9/basic89-source-issues.json';
const issues = JSON.parse(read(issueFile));
for (const grade of [8, 9]) {
  const file = `docs/curriculum-sources/ghana/ccp-b7-b9/basic${grade}-filumire-mapping.json`;
  const bytes = read(file), mapping = JSON.parse(bytes);
  inputs[file] = createHash('sha256').update(bytes).digest('hex');
  for (const subject of mapping.subjects) {
    const subjectId = subject.proposed_subject_id, gradeId = `level-gh-basic-${grade}-ccp`;
    subjects.push({ id: subjectId, gradeId, name: subject.subject, code: `GH-B${grade}-${subject.id.toUpperCase()}`, discipline: subject.id });
    for (const entry of subject.entries) {
      const source = { documentId: subject.id, localPath: entry.source.path, url: entry.source.url, sha256: entry.source.sha256, pdfPages: entry.source.continuation_pdf_pages, printedPage: entry.source.printed_page };
      let parent;
      for (const type of ['strand', 'sub_strand', 'content_standard']) {
        const h = entry.hierarchy[type], id = h.proposed_node_id;
        if (!nodes.has(id)) nodes.set(id, { id, subjectId, parentNodeId: parent, nodeType: type, title: h.title ?? h.displayed_statement_raw ?? h.source_heading, code: h.original_printed_code, structuralKey: h.structural_key, order: nodes.size + 1, source, sourceReference: `${source.localPath}#page=${entry.source.pdf_page}; sha256=${source.sha256}`, reviewFlags: entry.source_issue_ids });
        parent = id;
      }
      const indicatorId = entry.proposed_indicator_node_id;
      nodes.set(indicatorId, { id: indicatorId, subjectId, parentNodeId: parent, nodeType: 'learning_indicator', title: entry.proposed_competency_title, code: entry.source.original_printed_code, order: nodes.size + 1, source, sourceReference: `${source.localPath}#page=${entry.source.pdf_page}; sha256=${source.sha256}`, reviewFlags: entry.source_issue_ids });
      competencies.push({ id: entry.proposed_competency_id, curriculumVersionId: mapping.proposed_context.curriculum_version_id, gradeId, subjectId, curriculumNodeId: indicatorId, title: entry.proposed_competency_title, registrationStatus: 'proposed', learnerVisibility: 'hidden', officialCode: entry.source.original_printed_code, sourceEntryId: entry.entry_id, source,
        hierarchy: { strandId: entry.hierarchy.strand.proposed_node_id, subStrandId: entry.hierarchy.sub_strand.proposed_node_id, contentStandardId: parent },
        numbering: { filumire_format_alias: entry.numbering.filumire_indicator_alias, decision: entry.numbering.policy, evidence_pdf_pages: entry.source.continuation_pdf_pages, official_code_replaced: false },
        mappingStatus: entry.mapping_status, sourceIssueIds: entry.source_issue_ids, globalSourceIssueIds: issues.issues.filter(i => i.status === 'unresolved' && !i.affected_entries.length && (i.subject === 'all' || i.subject === subject.id) && i.grades.includes(grade)).map(i => i.id), review: entry.review ?? {}, phase8aReviewFlags: [],
        assessmentRequirements: entry.assessment_requirements.map(a => ({ kind: a.kind, suggested_response_modes: a.suggested_evidence_modes ?? [], source_excerpt: a.source_excerpt, source_pdf_pages: a.source_pdf_pages ?? [a.pdf_page], interpretation: a.interpretation })), activitySourceReference: entry.source_supported_activity_text,
        // Lossless original mapping retains source-specific issue and review fields.
        originalMapping: entry,
      });
    }
  }
}
inputs[issueFile] = createHash('sha256').update(read(issueFile)).digest('hex');
fs.writeFileSync(new URL('packages/curriculum-framework/ghana-b89-ccp-data.json', root), JSON.stringify({ inputHashes: inputs, subjects, nodes: [...nodes.values()], competencies, originalSourceIssues: issues }, null, 2) + '\n');
console.log(`Generated ${competencies.length} hidden source registrations; ${nodes.size} hierarchy nodes.`);

import fs from "node:fs";
import { MATERIALS_SOURCES, MATERIALS_BATCH_CONTENT } from "../services/content-store/ghana-b7-science-materials-batch";

const folder = "docs/curriculum-sources/ghana/ccp-b7-b9";
const out = "docs/jhs-development";
const results = fs.existsSync(`${out}/batch01-journeys.json`) ? JSON.parse(fs.readFileSync(`${out}/batch01-journeys.json`, "utf8")) : [];
const rows = [7, 8, 9].flatMap(grade => {
  const mapping = JSON.parse(fs.readFileSync(`${folder}/basic${grade}-filumire-mapping.json`, "utf8"));
  return mapping.subjects.flatMap((subject: any) => subject.entries.map((entry: any) => {
    const authored = MATERIALS_SOURCES.some(s => s.id === entry.proposed_competency_id);
    const cases = results.filter((r: any) => r.code === entry.source.original_printed_code);
    return { grade, subject: subject.subject, competencyId: entry.proposed_competency_id,
      entryId: entry.entry_id, officialCodeAsPrinted: entry.source.original_printed_code,
      source: entry.source, hierarchy: entry.hierarchy ?? { strand: entry.strand, subStrand: entry.sub_strand, contentStandard: entry.content_standard },
      sourceIssueIds: entry.source_issue_ids, numbering: entry.numbering,
      status: authored ? cases.length === 4 && cases.every((r: any) => r.passed) ? "authored_isolated_API_validated_human_review_pending" : "authored_validation_pending" : "not_authored",
      contentIds: MATERIALS_BATCH_CONTENT.filter(c => c.competencyId === entry.proposed_competency_id).map(c => c.id),
      publicRuntimeActive: false, educatorApproved: false, frenchApproved: false, completeForLearnerRelease: false,
      batch: authored ? "01-B7-Science-Materials" : null };
  }));
});
const summary = [7, 8, 9].flatMap(grade => ["English Language", "Mathematics", "Computing", "Science"].map(subject => {
  const group = rows.filter(r => r.grade === grade && r.subject === subject);
  const authored = group.filter(r => r.contentIds.length).length;
  return { grade, subject, mapped: group.length, authored, APIValidated: group.filter(r => r.status === "authored_isolated_API_validated_human_review_pending").length,
    remainingAuthoring: group.length - authored, completeForLearnerRelease: 0, remainingForLearnerRelease: group.length };
}));
fs.writeFileSync(`${out}/batch01-competency-matrix.json`, JSON.stringify({ denominator: "625 physical mapped source entries; duplicate printed codes retain unique IDs", rows }, null, 2));
fs.writeFileSync(`${out}/batch01-summary.json`, JSON.stringify(summary, null, 2));
console.log(`Coverage: ${rows.length} mapped entries; ${rows.filter(r => r.contentIds.length).length} authored; ${rows.filter(r => r.status === "authored_isolated_API_validated_human_review_pending").length} API-validated; 0 approved for release`);

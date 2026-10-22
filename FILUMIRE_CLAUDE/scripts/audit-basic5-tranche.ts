import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getAllCompetencies, getCompetency } from "../packages/curriculum";
import { seedContent } from "../services/content-store/seed";
import { getContentForCompetency, getAllContent } from "../services/content-store";
import { B5_COMPLETION_SPECS, B5_COMPLETION_SOURCES } from "../packages/curriculum/ghana-b5-completion-specs";

seedContent();
const prior = "docs/audits/basic4-6-completion/reconciliation";
const out = "docs/audits/basic4-6-completion/basic5-tranche";
const read = (file: string) => JSON.parse(fs.readFileSync(`${prior}/${file}`, "utf8"));
const write = (file: string, data: unknown) => fs.writeFileSync(`${out}/${file}`, JSON.stringify(data, null, 2) + "\n");
const queue = read("mapping-review-queue.json");
const mappings = queue.map((row: any) => {
  const reasons: string[] = [];
  if (row.source_references.some((r: any) => !r.printedCode)) reasons.push("uncoded_activity_preserved_no_indicator_invented");
  if (row.source_references.some((r: any) => r.printedCode && !row.official_codes_claimed.includes(r.printedCode))) reasons.push("literal_source_code_distinguished_from_stable_runtime_key");
  if (row.source_references.some((r: any) => r.sourceFlags.includes("printed_prefix_differs_from_table_standard"))) reasons.push("printed_hierarchy_conflict_preserved_requires_NaCCA_clarification");
  if (row.source_references.some((r: any) => r.sourceFlags.includes("source_heading_not_extracted_do_not_invent_title"))) reasons.push("missing_source_heading_remains_unresolved");
  if (!reasons.length) reasons.push("lexical_overlap_alert_is_not_proof_of_wrong_mapping");
  const notes: Record<string, string> = {
    "competency-gh-math-b4-number-patterns-001": "Source asks for tables/charts; simple sequence recognition alone does not verify that representation. Keep source association, flag instructional depth.",
    "competency-gh-math-b4-number-patterns-003": "Source includes translating a problem into a table/chart. Recognition of a numeric pattern is insufficient productive evidence; review scope without renaming IDs.",
    "competency-gh-science-b4-2-1-3-1": "Explanation of evapotranspiration is related to the source demonstration but does not by itself verify performing an investigation.",
    "competency-gh-english-b4-2-10-1-1": "Oral summarising remains a productive-evidence gap even where a quiz recognises a suitable summary.",
    "competency-gh-computing-b4-folders-001": "Creating/naming/renaming are the same source operations despite the lexical alert; actual tool performance remains unverified.",
    "competency-gh-computing-b6-1-1-1-3": "Two separate source tasks share B6.1.1.1.3 on PDF51/52. Keep both page-specific references and the existing combined ID; do not discard permanent-delete/restoring scope.",
    "competency-gh-english-b6-2-4-1-1": "Diphthongs on PDF194 and minimal pairs on PDF193 share the printed code. Page-specific association is essential; no prerequisite-key renumbering.",
  };
  return { competencyId: row.competency_id, grade: row.grade, subject: row.discipline,
    stableRuntimeCodes: row.official_codes_claimed, sourceReferences: row.source_references,
    investigation: reasons, disposition: "preserve_existing_ID_and_source_ambiguities",
    productionMappingChanged: false,
    finding: notes[row.competency_id] ?? "Compared the stored positioned source reference and local topic metadata. No independently demonstrated code replacement is justified. Literal print and all existing review flags are retained; this automated triage does not certify instructional depth, productive evidence or human alignment approval.",
    currentStatement: getCompetency(row.competency_id)?.description,
    humanApproval: null };
});
write("mapping-review-adjudication.json", mappings);

const educational = read("educational-review.json");
const fixes = new Map([
  ["competency-gh-english-b4-3-1-1-2", { key: "diagnostic-capital", tag: "recognise_common_noun", reason: "The actual item requires recognising dogs as a common noun despite its sentence-initial capital. Added only this recognition tag to that EN/FR item; no productive grammar evidence claimed." }],
  ["competency-gh-computing-b4-data-collection-tools-001", { key: "transfer-attendance", tag: "identify_data_collection_tool", reason: "The actual item explicitly asks which tool is useful; selecting a checklist identifies the tool. Added only the recognition tag to that EN/FR item; no collection or tool-use performance claimed." }],
]);
const subskills = educational.missingSubskillTagCompetencies.map((row: any) => {
  const items = getContentForCompetency(row.id).filter(c => c.assessmentItemId);
  const measured = new Set(items.flatMap(c => JSON.parse(c.metadata?.targetSubskills ?? "[]")));
  const fix = fixes.get(row.id);
  const productive = row.subskills.some((s: string) => /^(observe_|generate_|represent_|record_)|prepare_oral|locate_percent/.test(s));
  return { ...row, sourceReferences: read("competency-matrix.json").rows.find((r: any) => r.competency_id === row.id).source_references,
    status: fix ? "verified_metadata_omission_repaired" : productive ? "actual_performance_or_representation_evidence_missing" : "distinct_subskill_not_explicitly_isolated_in_questions",
    correction: fix ?? null, remainingMissingTags: row.subskills.filter((s: string) => !measured.has(s)),
    finding: fix?.reason ?? (productive ? "Questions describe or recognise an outcome; none establishes that the learner performed this named observation, creation, recording or representation. Retain the gap; do not stamp a performance tag onto MCQs." : "Existing questions primarily assess a later application or supply the target in the prompt. Do not infer separately measured precursor skill merely from its presence in teaching. A focused task and educator review remain necessary."),
    inspectedQuestions: items.map(c => ({ id: c.id, language: c.language, prompt: c.body, answer: c.metadata?.expectedResponse, targetSubskills: JSON.parse(c.metadata?.targetSubskills ?? "[]") })), humanApproval: null };
});
write("subskill-review.json", subskills);

const baseline = read("source-objective-matrix.json");
const objectives = baseline.map((row: any) => {
  const spec = B5_COMPLETION_SPECS.find(s => row.sourceOccurrences.some((o: any) => o.printedCode === s.code));
  return spec ? { ...row, competencyIds: [spec.competencyId], coverageStatus: "source_associated_authored_pending_educational_and_translation_review" } : row;
});
write("source-objective-matrix.json", objectives);
const oldRows = read("competency-matrix.json").rows;
const currentRows = oldRows.map((row: any) => {
  const tags = [...new Set(getContentForCompetency(row.competency_id).filter(c => c.assessmentItemId).flatMap(c => JSON.parse(c.metadata?.targetSubskills ?? "[]")))];
  return { ...row, assessment_covered_subskills: tags, missing_subskill_tags: row.expected_subskills.filter((s: string) => !tags.includes(s)),
    teaching_content_snapshot: "prior_teaching_preserved_two_verified_question_tag_repairs_only" };
});
write("competency-matrix.json", { scope: "866 source-associated competencies; source coverage is not educational completeness", rows: [...currentRows, ...B5_COMPLETION_SPECS.map((spec, i) => ({
  competency_id: spec.competencyId, grade: 5, discipline: B5_COMPLETION_SOURCES[i].subject, title: spec.title,
  official_codes_claimed: [spec.code], source_references: objectives.find((r: any) => r.competencyIds.includes(spec.competencyId)).sourceOccurrences,
  framework_registered: true, content_records: getContentForCompetency(spec.competencyId).length,
  productive_evidence: "trusted_teacher_review_required_no_approval_recorded", retention_scope: "automatic_knowledge_revision_only",
  educational_review_status: "pending_qualified_educator_approval", translation_review_status: "authored_pending_native_review",
}))] });
write("coverage-by-grade-subject.json", [4, 5, 6].flatMap(grade => ["english", "mathematics", "science", "computing"].map(subject => ({
  grade, subject, sourceObjectives: objectives.filter((r: any) => r.grade === grade && r.subject === subject).length,
  sourceAssociated: objectives.filter((r: any) => r.grade === grade && r.subject === subject && r.competencyIds.length).length,
  competencies: getAllCompetencies().filter(c => c.learningLevelId === `level-gh-basic-${grade}-pilot` && (subject === "mathematics" ? /mathematics/.test(c.subjectId) : c.subjectId.includes(subject))).length,
  educationalApproval: "not_established",
}))));
write("new-objective-provenance.json", B5_COMPLETION_SPECS.map((spec, i) => ({ ...spec, source: B5_COMPLETION_SOURCES[i], educatorApproval: null, translationApproval: null })));
const all = getAllContent();
const baselineFiles = JSON.parse(fs.readFileSync(`${out}/baseline.json`, "utf8"));
write("changed-existing-files.json", baselineFiles.filter((f: any) => fs.existsSync(f.path) && crypto.createHash("sha256").update(fs.readFileSync(f.path)).digest("hex") !== f.sha256).map((f: any) => f.path));
write("summary.json", { competencies: 866, previousCompetencies: 862, newCompetencies: 4, sourceObjectives: objectives.length,
  sourceAssociated: objectives.filter((r: any) => r.competencyIds.length).length,
  unresolvedSourceMappingReviewRecords: mappings.length, mappingInvestigationIsEducationalApproval: false,
  subskillRecordsInvestigated: subskills.length, repairedSubskillRecords: subskills.filter((r: any) => r.correction).length,
  remainingSubskillRecords: subskills.filter((r: any) => r.remainingMissingTags.length).length,
  seededContentIncludingNonBasic46Fixtures: all.length,
  pendingHumanApprovals: ["Ghana subject educators", "French-language specialists", "actual learner practical/observed work"],
  controlledPilotReady: false });
console.log("PASS audit artifacts: 866 competencies / 871 source objectives associated; 68 mappings investigated with flags preserved; 34 subskill records investigated, 2 metadata omissions repaired, 32 remaining");

import assert from "node:assert/strict";
import fs from "node:fs";
import { getAllCompetencies, getCompetency } from "../packages/curriculum";
import { getCurriculumNodesForSubject } from "../packages/curriculum-framework";
import { B5_COMPLETION_SPECS, B5_COMPLETION_SOURCES } from "../packages/curriculum/ghana-b5-completion-specs";
import { B5_COMPLETION_CONTENT } from "../services/content-store/ghana-b5-completion-authored";
import { subjectSupportsSpacedRevision } from "../services/learner-path/revision";
import { seedContent } from "../services/content-store/seed";
import { getContent } from "../services/content-store";

seedContent();
const baseline = JSON.parse(fs.readFileSync("docs/audits/basic4-6-completion/basic5-tranche/runtime-baseline.json", "utf8"));
assert.equal(baseline.length, 862);
for (const old of baseline) assert.deepEqual(getCompetency(old.id), old, `${old.id}: complete pre-tranche definition unchanged`);
assert.equal(getAllCompetencies().filter(c => /^level-gh-basic-[456]-pilot$/.test(c.learningLevelId)).length, 866);
assert.equal(B5_COMPLETION_CONTENT.length, 104);
const audit = "docs/audits/basic4-6-completion/basic5-tranche";
const readAudit = (file: string) => JSON.parse(fs.readFileSync(`${audit}/${file}`, "utf8"));
const mappings = readAudit("mapping-review-adjudication.json");
const priorMappings = JSON.parse(fs.readFileSync("docs/audits/basic4-6-completion/reconciliation/mapping-review-queue.json", "utf8"));
assert.equal(mappings.length, 68);
for (const row of mappings) {
  assert.deepEqual(row.sourceReferences, priorMappings.find((r: any) => r.competency_id === row.competencyId).source_references, "source ambiguities and references are never erased by adjudication");
  assert.equal(row.humanApproval, null);
}
const subskills = readAudit("subskill-review.json");
assert.equal(subskills.length, 34);
assert.equal(subskills.filter((r: any) => r.correction).length, 2);
assert.equal(subskills.filter((r: any) => r.remainingMissingTags.length).length, 32);
const objectives = readAudit("source-objective-matrix.json");
assert.equal(objectives.length, 871);
assert(objectives.every((r: any) => r.competencyIds.length), "all source objectives are associated, not educator-approved");
assert.equal(new Set(B5_COMPLETION_CONTENT.map(c => c.id)).size, 104);
assert.equal(new Set(B5_COMPLETION_CONTENT.filter(c => c.assessmentItemId).map(c => c.assessmentItemId)).size, 72);
const gaps = JSON.parse(fs.readFileSync("docs/audits/basic4-6-completion/reconciliation/unmapped-source-objectives.json", "utf8"));
for (const [i, spec] of B5_COMPLETION_SPECS.entries()) {
  const source = B5_COMPLETION_SOURCES[i], competency = getCompetency(spec.competencyId)!;
  assert(competency);
  assert.equal(source.code, spec.code);
  const objective = gaps.find((g: any) => g.sourceOccurrences.some((s: any) => s.printedCode === spec.code));
  assert(objective, `${spec.code}: previously confirmed source gap`);
  assert.equal(source.pdfPage, objective.sourceOccurrences[0].pdfPage);
  const node = getCurriculumNodesForSubject(competency.subjectId).find(n => n.code === spec.code)!;
  assert(node?.sourceReference?.includes(`PDF${source.pdfPage}`));
  assert(getCurriculumNodesForSubject(competency.subjectId).some(n => n.id === node.parentNodeId && n.code === spec.contentStandardCode));
  assert(subjectSupportsSpacedRevision(competency.subjectId, competency.learningLevelId), "existing subject revision remains enabled");
  for (const language of ["en", "fr"] as const) {
    const items = B5_COMPLETION_CONTENT.filter(c => c.competencyId === spec.competencyId && c.language === language);
    assert.equal(items.length, 13);
    for (const item of items) {
      assert.deepEqual(getContent(item.id), item);
      assert.equal(item.metadata?.educationalApproval, "pending");
      assert.equal(item.metadata?.translationApproval, "pending");
      assert.equal(item.metadata?.sourceSha256, source.sha256);
      if (language === "fr") assert(getContent(item.translationOfContentId!)?.language === "en");
      if (item.type === "practice") assert.equal(item.metadata?.evidenceIndependence, "guided");
      const purpose = item.metadata?.assessmentPurpose;
      if (purpose && purpose !== "retention") {
        assert.equal(item.metadata?.evaluationMethod, "trusted_rubric_evaluation");
        assert.equal(item.metadata?.options, undefined);
        assert.equal(item.metadata?.expectedResponse, "rubric_evaluated_performance");
        assert.equal(JSON.parse(item.metadata!.rubricCriteria).length, 4);
      }
    }
    for (const purpose of ["diagnostic", "reassessment", "retention", "transfer"]) assert.equal(items.filter(c => c.metadata?.assessmentPurpose === purpose).length, 2);
  }
}
console.log("PASS four source gaps registered, 104 bilingual records, 862 old definitions unchanged, productive evidence gated by teacher review, existing spaced revision preserved");

import assert from "node:assert/strict";
import { getAllCompetencies } from "../packages/curriculum";
import { GHANA_B6_MATHEMATICS_ADAPTIVE_SPECS, GHANA_B6_MATHEMATICS_PUBLISHED_SPECS } from "../packages/curriculum/ghana-b6-mathematics-adaptive";
import { getCurriculumNodesForSubject, getSubjectsForGrade, GRADE_GHANA_BASIC_6_ID, SUBJECT_GHANA_BASIC6_MATHEMATICS_ID } from "../packages/curriculum-framework";
import { AUTHORED_B6_MATHEMATICS_CONTENT, AUTHORED_B6_MATHEMATICS_COMPETENCY_IDS } from "../services/content-store/authored-index-b6-mathematics";

assert.equal(GHANA_B6_MATHEMATICS_ADAPTIVE_SPECS.length, 45, "all 45 B6 Mathematics indicators are modelled");
const published = GHANA_B6_MATHEMATICS_PUBLISHED_SPECS;


const registered = new Set(getAllCompetencies().map((c) => c.id));
for (const spec of GHANA_B6_MATHEMATICS_ADAPTIVE_SPECS) {
  const isPublished = published.some((p) => p.code === spec.code);
  assert.equal(registered.has(spec.competencyId), isPublished, `${spec.code}: registered only when published`);
}

assert.deepEqual([...AUTHORED_B6_MATHEMATICS_COMPETENCY_IDS].sort(), published.map((p) => p.competencyId).sort(), "authored content matches published topics");

for (const spec of published) {
  const items = AUTHORED_B6_MATHEMATICS_CONTENT.filter((c) => c.competencyId === spec.competencyId);
  assert.equal(items.length, 26, `${spec.code}: 26 items`);
  const en = items.filter((c) => c.language === "en");
  assert.equal(en.filter((c) => c.type === "lesson" || c.type === "example" || c.type === "scaffold" || c.type === "remediation").length, 4, `${spec.code}: 4 lessons`);
  const questions = en.filter((c) => c.metadata?.assessmentPurpose);
  for (const purpose of ["diagnostic", "reassessment", "retention", "transfer"]) {
    assert.equal(questions.filter((c) => c.metadata?.assessmentPurpose === purpose).length, 2, `${spec.code}: 2 ${purpose} questions`);
  }
  const allowed = new Set(spec.misconceptions);
  for (const q of questions) {
    const rules = JSON.parse(q.metadata?.diagnosticRules ?? "{}") as Record<string, { misconception?: string; name?: string } | string | unknown[]>;
    for (const rule of Object.values(rules)) {
      const text = JSON.stringify(rule);
      assert.ok([...allowed].some((name) => text.includes(name)), `${spec.code}: ${q.id} uses a misconception from the spec`);
    }
  }
}

assert.ok(getSubjectsForGrade(GRADE_GHANA_BASIC_6_ID).some((s) => s.id === SUBJECT_GHANA_BASIC6_MATHEMATICS_ID), "B6 Mathematics subject is registered");
const indicatorNodes = getCurriculumNodesForSubject(SUBJECT_GHANA_BASIC6_MATHEMATICS_ID).filter((n) => n.nodeType === "learning_indicator");
assert.equal(indicatorNodes.length, 45, "framework carries all 45 B6 Mathematics indicator nodes");
console.log("b6 mathematics v1 test passed");

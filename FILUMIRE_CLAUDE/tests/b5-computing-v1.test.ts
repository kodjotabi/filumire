import assert from "node:assert/strict";
import { getAllCompetencies } from "../packages/curriculum";
import { GHANA_B5_COMPUTING_ADAPTIVE_SPECS, GHANA_B5_COMPUTING_PUBLISHED_SPECS } from "../packages/curriculum/ghana-b5-computing-adaptive";
import { getCurriculumNodesForSubject, getSubjectsForGrade, GRADE_GHANA_BASIC_5_ID, SUBJECT_GHANA_BASIC5_COMPUTING_ID } from "../packages/curriculum-framework";
import { AUTHORED_B5_COMPUTING_CONTENT, AUTHORED_B5_COMPUTING_COMPETENCY_IDS } from "../services/content-store/authored-index-b5-computing";

assert.equal(GHANA_B5_COMPUTING_ADAPTIVE_SPECS.length, 82, "82 source-reconciled B5 Computing specifications remain modelled; official source gaps are checked separately");
const published = GHANA_B5_COMPUTING_PUBLISHED_SPECS;
assert.ok(published.length > 0, "at least one topic is published");

const registered = new Set(getAllCompetencies().map((c) => c.id));
for (const spec of GHANA_B5_COMPUTING_ADAPTIVE_SPECS) {
  const isPublished = published.some((p) => p.code === spec.code);
  assert.equal(registered.has(spec.competencyId), isPublished, `${spec.code}: registered only when published`);
}

assert.deepEqual([...AUTHORED_B5_COMPUTING_COMPETENCY_IDS].sort(), published.map((p) => p.competencyId).sort(), "authored content matches published topics");

for (const spec of published) {
  const items = AUTHORED_B5_COMPUTING_CONTENT.filter((c) => c.competencyId === spec.competencyId);
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

assert.ok(getSubjectsForGrade(GRADE_GHANA_BASIC_5_ID).some((s) => s.id === SUBJECT_GHANA_BASIC5_COMPUTING_ID), "B5 Computing subject is registered");
const indicatorNodes = getCurriculumNodesForSubject(SUBJECT_GHANA_BASIC5_COMPUTING_ID).filter((n) => n.nodeType === "learning_indicator");
assert.equal(indicatorNodes.length, 82, "framework carries the 82 source-reconciled B5 Computing indicator nodes");
console.log("b5 computing v1 test passed");

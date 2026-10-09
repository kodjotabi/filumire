import assert from "node:assert/strict";
import {
  getAllCompetencies,
  getCompetency,
  getCompetenciesForCurriculumSubjectLevel,
  getContentStandard,
  getInitialCompetencyForCurriculumSubjectLevel,
  getLearningIndicator,
  getStrand,
  getSubStrand,
  GHANA_B6_PILOT_LEVEL_ID,
  GHANA_MATH_PILOT_CURRICULUM_ID,
} from "../packages/curriculum";
import { GHANA_B6_ENGLISH_ADAPTIVE_SPECS, GHANA_B6_ENGLISH_PUBLISHED_SPECS } from "../packages/curriculum/ghana-b6-english-adaptive";
import {
  CURRICULUM_VERSION_GHANA_PILOT_V1_ID,
  getCompetencyMappingsForCompetency,
  getCurriculumNode,
  getCurriculumNodesForSubject,
  getSubjectsForGrade,
  GRADE_GHANA_BASIC_6_ID,
  resolveCurriculumContext,
  SUBJECT_GHANA_BASIC6_ENGLISH_ID,
} from "../packages/curriculum-framework";
import { AUTHORED_B6_ENGLISH_CONTENT, AUTHORED_B6_ENGLISH_COMPETENCY_IDS } from "../services/content-store/authored-index-b6-english";
import { AUTHORED_B5_ENGLISH_CONTENT } from "../services/content-store/authored-index-b5-english";
import { AUTHORED_B6_MATHEMATICS_CONTENT } from "../services/content-store/authored-index-b6-mathematics";
import { AUTHORED_B5_MATHEMATICS_CONTENT } from "../services/content-store/authored-index-b5-mathematics";
import { AUTHORED_B6_SCIENCE_CONTENT } from "../services/content-store/authored-index-b6-science";
import { AUTHORED_B5_SCIENCE_CONTENT } from "../services/content-store/authored-index-b5-science";
import { AUTHORED_B6_COMPUTING_CONTENT } from "../services/content-store/authored-index-b6-computing";
import { AUTHORED_B5_COMPUTING_CONTENT } from "../services/content-store/authored-index-b5-computing";
import { AUTHORED_CONTENT } from "../services/content-store/authored-index";
import { getContent, getContentForCompetency } from "../services/content-store";
import { seedContent } from "../services/content-store/seed";

// Curriculum layer: all 134 indicators modelled, each published topic registered once.
assert.equal(GHANA_B6_ENGLISH_ADAPTIVE_SPECS.length, 134, "all 134 B6 English indicators are modelled");
const published = GHANA_B6_ENGLISH_PUBLISHED_SPECS;
assert.equal(published.length, 134, "all 134 B6 English topics are published");
assert.equal(new Set(published.map((p) => p.code)).size, 134, "indicator codes are unique");

const all = getAllCompetencies();
assert.equal(new Set(all.map((c) => c.id)).size, all.length, "no duplicate competency ids across subjects");
const registered = new Set(all.map((c) => c.id));
for (const spec of GHANA_B6_ENGLISH_ADAPTIVE_SPECS) {
  const isPublished = published.some((p) => p.code === spec.code);
  assert.equal(registered.has(spec.competencyId), isPublished, `${spec.code}: registered only when published`);
}

assert.deepEqual([...AUTHORED_B6_ENGLISH_COMPETENCY_IDS].sort(), published.map((p) => p.competencyId).sort(), "authored content matches published topics");

const bySubject = getCompetenciesForCurriculumSubjectLevel(GHANA_MATH_PILOT_CURRICULUM_ID, SUBJECT_GHANA_BASIC6_ENGLISH_ID, GHANA_B6_PILOT_LEVEL_ID);
assert.deepEqual(bySubject.map((c) => c.id), published.map((p) => p.competencyId), "subject and level lookup returns B6 English in curriculum order");
assert.equal(
  getInitialCompetencyForCurriculumSubjectLevel(GHANA_MATH_PILOT_CURRICULUM_ID, SUBJECT_GHANA_BASIC6_ENGLISH_ID, GHANA_B6_PILOT_LEVEL_ID)?.id,
  "competency-gh-english-b6-1-1-1-1",
  "B6 English starts at B6.1.1.1.1",
);

for (const spec of published) {
  const competency = getCompetency(spec.competencyId);
  assert.ok(competency, `${spec.code}: competency registered`);
  assert.ok(getStrand(competency.strandId), `${spec.code}: strand resolves`);
  assert.ok(getSubStrand(competency.subStrandId), `${spec.code}: sub-strand resolves`);
  assert.ok(getContentStandard(competency.contentStandardId), `${spec.code}: content standard resolves`);
  assert.equal(getLearningIndicator(competency.learningIndicatorId)?.statement, spec.statement, `${spec.code}: indicator resolves`);
  for (const id of [...competency.prerequisiteCompetencyIds, ...competency.successorCompetencyIds, ...competency.relatedCompetencyIds]) {
    assert.ok(getCompetency(id), `${spec.code}: linked competency ${id} exists`);
  }
  assert.equal(competency.subskills.length, 3, `${spec.code}: 3 subskills`);
  assert.equal(competency.misconceptions.length, 3, `${spec.code}: 3 misconceptions`);
}

// Framework layer: subject registered, full NaCCA hierarchy, one direct mapping per indicator.
assert.ok(getSubjectsForGrade(GRADE_GHANA_BASIC_6_ID).some((s) => s.id === SUBJECT_GHANA_BASIC6_ENGLISH_ID), "B6 English subject is registered");
assert.ok(resolveCurriculumContext(CURRICULUM_VERSION_GHANA_PILOT_V1_ID, GRADE_GHANA_BASIC_6_ID, SUBJECT_GHANA_BASIC6_ENGLISH_ID), "B6 English curriculum context resolves");
const nodes = getCurriculumNodesForSubject(SUBJECT_GHANA_BASIC6_ENGLISH_ID);
assert.equal(new Set(nodes.map((n) => n.id)).size, nodes.length, "no duplicate node ids");
const indicatorNodes = nodes.filter((n) => n.nodeType === "learning_indicator");
assert.equal(indicatorNodes.length, 134, "framework carries all 134 B6 English indicator nodes");
for (const node of nodes) {
  if (node.nodeType === "strand") {
    assert.equal(node.parentNodeId, undefined, `${node.code}: strand has no parent`);
  } else {
    assert.ok(node.parentNodeId && getCurriculumNode(node.parentNodeId)?.subjectId === SUBJECT_GHANA_BASIC6_ENGLISH_ID, `${node.code}: parent node exists in B6 English`);
  }
}
for (const spec of published) {
  const mappings = getCompetencyMappingsForCompetency(spec.competencyId);
  assert.equal(mappings.length, 1, `${spec.code}: one mapping`);
  assert.equal(getCurriculumNode(mappings[0].curriculumNodeId)?.code, spec.code, `${spec.code}: mapped to its own indicator node`);
}

// Content store: 26 items per topic, seeded without overwriting or being overwritten by another subject.
for (const spec of published) {
  const items = AUTHORED_B6_ENGLISH_CONTENT.filter((c) => c.competencyId === spec.competencyId);
  assert.equal(items.length, 26, `${spec.code}: 26 items`);
  const en = items.filter((c) => c.language === "en");
  assert.equal(en.filter((c) => c.type === "lesson" || c.type === "example" || c.type === "scaffold" || c.type === "remediation").length, 4, `${spec.code}: 4 lessons`);
  const questions = en.filter((c) => c.metadata?.assessmentPurpose);
  for (const purpose of ["diagnostic", "reassessment", "retention", "transfer"]) {
    assert.equal(questions.filter((c) => c.metadata?.assessmentPurpose === purpose).length, 2, `${spec.code}: 2 ${purpose} questions`);
  }
  const allowed = new Set(spec.misconceptions);
  for (const q of questions) {
    const rules = JSON.parse(q.metadata?.diagnosticRules ?? "{}") as Record<string, { errorPattern: string }>;
    for (const rule of Object.values(rules)) {
      assert.ok(allowed.has(rule.errorPattern), `${spec.code}: ${q.id} uses a misconception from the spec`);
    }
    for (const subskill of JSON.parse(q.metadata?.targetSubskills ?? "[]") as string[]) {
      assert.ok(spec.subskills.includes(subskill), `${spec.code}: ${q.id} targets a subskill from the spec`);
    }
  }
}

seedContent();
const others = [
  ...AUTHORED_CONTENT, ...AUTHORED_B6_SCIENCE_CONTENT, ...AUTHORED_B5_SCIENCE_CONTENT, ...AUTHORED_B6_COMPUTING_CONTENT,
  ...AUTHORED_B5_COMPUTING_CONTENT, ...AUTHORED_B6_MATHEMATICS_CONTENT, ...AUTHORED_B5_MATHEMATICS_CONTENT, ...AUTHORED_B5_ENGLISH_CONTENT,
];
for (const item of [...AUTHORED_B6_ENGLISH_CONTENT, ...others]) {
  assert.equal(getContent(item.id)?.competencyId, item.competencyId, `${item.id}: seeded content is not overwritten`);
}
for (const spec of published) {
  assert.equal(getContentForCompetency(spec.competencyId).length, 26, `${spec.code}: 26 items retrievable from the content store`);
  assert.equal(getContentForCompetency(spec.competencyId, "fr").length, 13, `${spec.code}: 13 French items retrievable`);
}

console.log("b6 english v1 test passed");

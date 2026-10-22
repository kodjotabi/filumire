import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as f from "../packages/curriculum-framework";
import { getCompetenciesForSubject } from "../packages/curriculum";
import { subjectTopics } from "../services/curriculum-navigation";
import { seedContent } from "../services/content-store/seed";
import { getContentForCompetency } from "../services/content-store";

// Fingerprints captured from the actual working tree before Phase 8C, including earlier uncommitted repairs.
// Cover all definitions, mappings, hierarchy, EN/FR topic order and authored content (excluding timestamps).
const expected: Record<string, string> = {
  "subject-gh-basic-4-mathematics-pilot": "a6b421a2ddec2efed5b6e3d6d09d2655cd470f297148c0613b98cbf9a03566b1",
  // Re-pinned 22 Oct 2026 (approved): proper-common-nouns-001 diagnostic-capital EN/FR gain subskill tag recognise_common_noun, version 1.1.
  "subject-gh-basic4-english-pilot": "909a529e0855b117ed24be3f1570946c35814a941dd822807c287ec153a87221",
  "subject-gh-basic4-science-pilot": "b840e7b30cad30528ad67d6703ad7d349cb3850048f743ed5cffb485b7397a8a",
  // Re-pinned 22 Oct 2026 (approved): data-collection-tools-001 transfer-attendance EN/FR gain subskill tag identify_data_collection_tool, version 1.1.
  "subject-gh-basic4-computing-pilot": "5892a9f42359b1c9bb97e994c929a62e4d64af7cda2b6bdc9d523228e910d05e",
  // Re-pinned 22 Oct 2026 (approved): Basic 5 tranche (+1 competency, +1 node, +26 records) and the
  // life-processes-001 lesson/scaffold EN/FR respiration wording repair ("in its cells"), version 1.1.
  "subject-gh-basic5-science-pilot": "e6834d09fa695ddd35217fc5ed595cdf29cd7154c0c6e1aa712bc004455ea36c",
  // Re-pinned 22 Oct 2026 for the approved Basic 5 completion tranche: 3 competencies, 4 nodes, 78 records added; nothing existing changed.
  "subject-gh-basic5-computing-pilot": "d506696b0a1c5107da69b891e8343730da524091f071d2fbcce19a1cc3305569",
  "subject-gh-basic5-mathematics-pilot": "366d2f5aed23e85bb5c938e10de9953a41e2b90a3b9f0c4458df520daab6f132",
  "subject-gh-basic5-english-pilot": "c76d3812d16f9e27c8ece5164723d6c9b662457d9711c869d93d50b81e24bb78",
  "subject-gh-basic6-science-pilot": "8b0e7003ee4cc71c0db266537ec162247328728d4c65a340ff90a73daea8afd1",
  "subject-gh-basic6-computing-pilot": "835a92073c50637f742307187f3252c8c1cc82736147d287884b3873b15b42f4",
  "subject-gh-basic6-mathematics-pilot": "f6572a940238d938ab86a844a34a4f28b7fb79589f253fd87e5395326b5a6ec1",
  "subject-gh-basic6-english-pilot": "98e413ab9a1504c70d0b896bdbdc0ca2470d48c55f714a46cf57d95ede2af41e",
};
seedContent();
const grades = f.getSupportedGradesForCurriculumVersion(f.CURRICULUM_VERSION_GHANA_PILOT_V1_ID);
assert.deepEqual(grades.map(g => g.order), [4, 5, 6]);
const seen: string[] = [];
for (const grade of grades) for (const subject of f.getSubjectsForGrade(grade.id)) {
  const nodes = f.getCurriculumNodesForSubject(subject.id), competencies = getCompetenciesForSubject(subject.id);
  const data = { grade, subject, capability: f.getSubjectCapability(subject.id), nodes,
    mappings: nodes.flatMap(n => f.getCompetencyMappingsForNode(n.id)), competencies,
    topics: (["en", "fr"] as const).map(lang => subjectTopics(subject.id, lang)),
    content: competencies.flatMap(c => (["en", "fr"] as const).map(lang => getContentForCompetency(c.id, lang).map(({ createdAt, updatedAt, ...stable }) => stable))),
  };
  assert.equal(createHash("sha256").update(JSON.stringify(data)).digest("hex"), expected[subject.id], `${subject.name} Basic ${grade.order} changed since before Phase 8C`);
  seen.push(subject.id);
}
assert.deepEqual(seen.sort(), Object.keys(expected).sort());
console.log("PASS all 12 Basic 4-6 subjects: definitions, hierarchy, mappings, bilingual navigation and authored content unchanged");

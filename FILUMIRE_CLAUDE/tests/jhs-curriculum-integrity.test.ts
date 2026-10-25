import assert from "node:assert/strict";
import { assertJhsAutomaticBank } from './fixtures/jhs-automatic-bank';
import fs from "node:fs";
import { createHash } from "node:crypto";
import { MATERIALS_BATCH_CONTENT, MATERIALS_SOURCES, MATERIALS_COMPETENCIES } from "../services/content-store/ghana-b7-science-materials-batch";
import { pilotContent } from "../services/content-store/ghana-b7-materials-pilot";
import { getAllCompetencies, registerIsolatedBasic7TestCurriculum } from "../packages/curriculum";
import { getAvailableSubjectsForGrade } from "../packages/curriculum-framework";
import { seedContent } from "../services/content-store/seed";
import { getAllContent } from "../services/content-store";
import { ccpSourcePath } from "./fixtures/ccp-source";
import { installMaterialsBatch } from "./fixtures/jhs-materials-batch";

const folder = "docs/curriculum-sources/ghana/ccp-b7-b9";
const coverage = JSON.parse(fs.readFileSync(`${folder}/basic7-9-coverage.json`, "utf8"));
const all = [7, 8, 9].flatMap(grade => JSON.parse(fs.readFileSync(`${folder}/basic${grade}-filumire-mapping.json`, "utf8")).subjects.flatMap((s: any) => s.entries));
assert.equal(all.length, 625); assert.equal(new Set(all.map(e => e.proposed_competency_id)).size, 625);
assert.equal(coverage.total_entries, 625);
for (const doc of JSON.parse(fs.readFileSync(`${folder}/basic7-source-manifest.json`, "utf8")).documents) {
  assert.equal(createHash("sha256").update(fs.readFileSync(ccpSourcePath(doc.local_path))).digest("hex"), doc.sha256);
}
const lineage = JSON.parse(fs.readFileSync("docs/jhs-development/lineage-manifest.json", "utf8"));
for (const input of lineage.records.filter((r: any) => r.role === "Phase8A_to_8D_mapping_input")) {
  assert.equal(createHash("sha256").update(fs.readFileSync(input.path)).digest("hex"), input.sha256, `${input.path}: exact source mapping and unresolved issues unchanged`);
}
assert.equal(MATERIALS_BATCH_CONTENT.length, 132);
assert.equal(new Set(MATERIALS_BATCH_CONTENT.map(c => c.id)).size, 132);
seedContent();
assert(MATERIALS_SOURCES.every(s => !getAllCompetencies().some(c => c.id === s.id)));
assert(MATERIALS_SOURCES.every(s => !getAllContent().some(c => c.competencyId === s.id)));
assert.deepEqual(getAvailableSubjectsForGrade(MATERIALS_SOURCES[0].curriculumVersionId, MATERIALS_SOURCES[0].gradeId), []);
assert.throws(() => registerIsolatedBasic7TestCurriculum(MATERIALS_COMPETENCIES[0], { id: "invalid", learningLevelId: "invalid", name: "invalid", code: "invalid" }, { id: "invalid", educationSystemId: "invalid", name: "invalid", order: 7 }), /isolated in-memory/);
for (const source of MATERIALS_SOURCES) {
  assert.deepEqual(source.sourceIssueIds, []);
  assert(all.some(r => r.proposed_competency_id === source.id && r.source.original_printed_code === source.officialCode));
  const contents = MATERIALS_BATCH_CONTENT.filter(c => c.competencyId === source.id);
  assertJhsAutomaticBank(contents);
  for (const language of ["en", "fr"]) {
    const items = contents.filter(c => c.language === language);
    assert.equal(items.length, 22);
    assert.equal(items.filter(c => c.metadata?.evaluationMethod === "trusted_rubric_evaluation").length, 6);
    for (const item of items) {
      assert.equal(item.metadata?.educatorApproval, "pending");
      if (item.type === "practice") assert.equal(item.metadata?.evidenceIndependence, "guided");
      if (item.metadata?.evidenceRole === 'optional_teacher_extension') {
        assert.equal(item.metadata?.evaluationMethod, "trusted_rubric_evaluation");
        assert.equal(item.metadata?.options, undefined);
      }
    }
  }
}
const reused = MATERIALS_BATCH_CONTENT.filter(c => pilotContent.some(p => p.id === c.id));
assert.equal(reused.length, 14, "reuse original teaching, practice and revision IDs instead of duplicating the first pilot");
for (const item of reused) {
  const old = pilotContent.find(p => p.id === item.id)!;
  assert.equal(item.body, old.body); assert.equal(item.assessmentItemId, old.assessmentItemId);
}
const previous = JSON.stringify(getAllCompetencies());
Object.defineProperty(process.env, "NODE_ENV", {value:"test",writable:true,configurable:true,enumerable:true});
process.env.FILUMIRE_BASIC7_PILOT = "test-only";
installMaterialsBatch();
assert.equal(JSON.stringify(getAllCompetencies().filter(c => !MATERIALS_SOURCES.some(s => s.id === c.id))), previous, "every pre-existing runtime definition is unchanged");
assert.throws(installMaterialsBatch, /already installed/);
console.log("PASS 625 source IDs, source checksums/mappings, hidden publication, 132 bilingual records, automatic banks, retained teacher extensions and 14 reused pilot records");

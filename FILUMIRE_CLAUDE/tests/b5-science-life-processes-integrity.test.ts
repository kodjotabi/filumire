import assert from "node:assert/strict";
import fs from "node:fs";
import { seedContent } from "../services/content-store/seed";
import { getContentForCompetency } from "../services/content-store";
import { getCompetency } from "../packages/curriculum";

assert.equal(process.env.FILUMIRE_PERSISTENCE, "memory");
seedContent();
const id = "competency-gh-science-b5-1-1-1-1";
const base = "docs/audits/basic4-6-completion";
const previous = JSON.parse(fs.readFileSync(`${base}/seeded-content.json`, "utf8")).filter((c: any) => c.competencyId === id);
const current = getContentForCompetency(id);
assert.equal(current.length, 26);
assert.deepEqual(current.map(c => c.id).sort(), previous.map((c: any) => c.id).sort(), "every content and assessment identity remains compatible");
const stable = (item: unknown) => {
  const result = JSON.parse(JSON.stringify(item));
  delete result.createdAt; delete result.updatedAt;
  return result;
};
for (const item of current) {
  const before = previous.find((c: any) => c.id === item.id);
  assert(before);
  if (item.type === "lesson" || item.type === "scaffold") {
    assert.notEqual(item.body, before.body);
    assert.equal(item.version, "authored-life-processes-1.1");
    assert(!/with the help of oxygen|food with oxygen|avec l'aide de l'oxygène|aliments avec l'oxygène/.test(item.body), "general life-process teaching does not require oxygen for every organism");
    assert.match(item.body, item.language === "en" ? /energy from food.*cells/ : /énergie.*aliments.*cellules/);
    assert.deepEqual(stable({ ...item, body: before.body, version: before.version }), stable(before), "only teaching wording and teaching version change");
  } else assert.deepEqual(stable(item), stable(before), "questions, options, keys, diagnosis, evidence tags and unchanged teaching remain exact");
}
const oldDefinition = JSON.parse(fs.readFileSync(`${base}/coverage-matrix.json`, "utf8")).rows.find((c: any) => c.competency_id === id);
const definition = getCompetency(id)!;
assert.deepEqual(definition.masteryRequirements, oldDefinition.mastery);
assert.deepEqual(definition.retentionRequirements, oldDefinition.retention);
assert.deepEqual(definition.transferRequirements, oldDefinition.transfer);
if (process.env.FILUMIRE_RECORD_RECONCILIATION === "1") fs.writeFileSync(`${base}/reconciliation/corrected-science-content.json`, JSON.stringify(current, null, 2) + "\n");
console.log("PASS bilingual Science accuracy correction: 4 teaching records versioned; all 26 identities, all assessment records and mastery/retention/transfer rules preserved");

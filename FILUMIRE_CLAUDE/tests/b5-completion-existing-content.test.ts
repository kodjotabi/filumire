import assert from "node:assert/strict";
import fs from "node:fs";
import { seedContent } from "../services/content-store/seed";
import { getContent } from "../services/content-store";

seedContent();
const root = "docs/audits/basic4-6-completion";
const previous = JSON.parse(fs.readFileSync(`${root}/seeded-content.json`, "utf8"));
const scienceCorrection = JSON.parse(fs.readFileSync(`${root}/reconciliation/corrected-science-content.json`, "utf8"));
const corrected = new Map(scienceCorrection.map((c: any) => [c.id, c]));
// Compare persisted JSON with the JSON audit snapshot; undefined optional
// properties and newly generated timestamps are not stored content changes.
const clean = (c: any) => { const { createdAt, updatedAt, ...rest } = c; return JSON.parse(JSON.stringify(rest)); };
let tagged = 0;
for (const original of previous) {
  const before = structuredClone(corrected.get(original.id) ?? original);
  if (before.id.includes("eng-proper-common-nouns-001-diagnostic-capital-")) {
    before.metadata.targetSubskills = JSON.stringify([...JSON.parse(before.metadata.targetSubskills), "recognise_common_noun"]);
    before.version = "authored-eng-proper-common-nouns-1.1"; tagged++;
  }
  if (before.id.includes("data-collection-tools-001-transfer-attendance-")) {
    before.metadata.targetSubskills = JSON.stringify([...JSON.parse(before.metadata.targetSubskills), "identify_data_collection_tool"]);
    before.version = "authored-data-collection-tools-1.1"; tagged++;
  }
  const current = getContent(before.id);
  assert(current, `existing content ${before.id} remains available`);
  assert.deepEqual(clean(current), clean(before), `${before.id}: no changes beyond the four verified tag/version repairs and previously approved Science correction`);
}
assert.equal(previous.length, 22432);
assert.equal(tagged, 4, "two verified question tags in both languages, no blanket tagging");
console.log("PASS all 22432 existing Basic 4–6 content records preserved, except four explicitly verified tag/version updates; prior Science correction retained");

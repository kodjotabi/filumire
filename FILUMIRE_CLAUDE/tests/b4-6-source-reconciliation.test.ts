import { B5_COMPLETION_SPECS } from "../packages/curriculum/ghana-b5-completion-specs";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { getAllCompetencies } from "../packages/curriculum";

const root = "docs/audits/basic4-6-completion/reconciliation";
const read = (name: string) => JSON.parse(fs.readFileSync(`${root}/${name}`, "utf8"));
const manifest = read("source-manifest.json").sources;
const rows = read("competency-matrix.json").rows;
const requirements = read("source-objective-matrix.json");
const occurrences = read("positioned-indicator-occurrences.json");
assert.equal(manifest.length, 4);
for (const source of manifest) {
  const file = process.env.FILUMIRE_B46_SOURCE_ROOT ? path.join(process.env.FILUMIRE_B46_SOURCE_ROOT, path.basename(source.localPath)) : source.localPath;
  assert(fs.existsSync(file), `Required existing official source PDF unavailable: ${file}; set FILUMIRE_B46_SOURCE_ROOT to its directory`);
  assert.equal(crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"), source.sha256);
  assert(source.coverAndPublicationText[0].text.includes("SEPTEMBER 2019"));
  const pages = read(`${source.subject}-pages.json`);
  assert.equal(pages.length, source.pdfPages);
  for (const record of occurrences.filter((r: any) => r.subject === source.subject)) {
    assert(record.pdfPage >= 1 && record.pdfPage <= pages.length);
    const page = pages[record.pdfPage - 1];
    const line = page.lines.find((l: any) => l.y === record.y);
    assert(line, `${record.id}: physical source position exists`);
    if (record.code) assert(line.text.replace(/\s/g, "").includes(record.code), `${record.id}: original printed code occurs at recorded position`);
    else assert(line.text.includes("Reflective Writing"), "uncoded activity stays uncoded");
  }
}
const runtime = getAllCompetencies().filter(c => /^level-gh-basic-[456]-pilot$/.test(c.learningLevelId));
assert.equal(rows.length, 862);
assert.equal(new Set(rows.map((r: any) => r.competency_id)).size, 862);
assert.deepEqual([...rows.map((r: any) => r.competency_id), ...B5_COMPLETION_SPECS.map(c => c.competencyId)].sort(), runtime.map(c => c.id).sort());
assert.equal(occurrences.length, 876);
const independentIndex = read("independent-printed-code-index.json");
assert.equal(independentIndex.occurrences.length, 879);
assert.deepEqual(independentIndex.notInIndicatorInventory.map((r: any) => r.code).sort(), ["P6.5.2.2.3", "B5.6.4.9.1"].sort());
assert(independentIndex.notInIndicatorInventory.every((r: any) => r.disposition !== "unresolved_extraction_requires_review"), "every additional printed code is accounted for without inventing an indicator");
assert.equal(requirements.length, 871, "five repeated objectives are linked, not counted as additional coverage");
assert.deepEqual([4, 5, 6].flatMap(grade => ["english", "mathematics", "science", "computing"].map(subject =>
  requirements.filter((r: any) => r.grade === grade && r.subject === subject).length)),
  [131, 71, 24, 27, 134, 67, 29, 82, 134, 45, 28, 99], "all 12 source inventories remain explicit, including objectives combined in one competency");
const linkedOccurrences = requirements.flatMap((r: any) => r.sourceOccurrences.map((s: any) => s.id));
assert.equal(new Set(linkedOccurrences).size, occurrences.length);
for (const row of rows) {
  assert(row.source_references.length, `${row.competency_id}: no invented or missing source association`);
  assert.equal(row.educational_review_status, "pending_qualified_educator_approval");
  for (const ref of row.source_references) {
    const source = occurrences.find((s: any) => s.id === ref.occurrenceId);
    assert(source);
    assert.equal(ref.printedCode, source.code);
    assert.equal(ref.rawPrintedCode, source.rawCode);
    assert.equal(ref.pdfPage, source.pdfPage);
    assert.equal(ref.tableContentStandard, source.tableContentStandard);
    assert.deepEqual(ref.sourceFlags, source.sourceFlags);
    assert.equal(ref.humanAlignmentApproval, null);
    assert(requirements.some((r: any) => r.id === ref.requirementId && r.competencyIds.includes(row.competency_id)));
  }
}
const missing = requirements.filter((r: any) => !r.competencyIds.length);
assert.deepEqual(missing.flatMap((r: any) => r.sourceOccurrences.map((s: any) => s.printedCode)).sort(), ["B5.2.2.1.2", "B5.1.3.1.9", "B5.1.3.1.10", "B5.6.4.9.1.2"].sort());
const diphthong = rows.find((r: any) => r.competency_id === "competency-gh-english-b6-2-4-1-1");
assert.equal(diphthong.source_references[0].printedCode, "B6.2.3.1.1");
assert.equal(diphthong.source_references[0].pdfPage, 194);
const probability = rows.find((r: any) => r.competency_id === "competency-gh-math-b6-4-2-2-3");
assert.equal(probability.source_references[0].printedCode, "P6.4.2.2.3");
assert.equal(rows.find((r: any) => r.competency_id === "competency-gh-english-b6-4-10-1-1").source_references[0].printedCode, null);
console.log("PASS all 862 competency associations, four original PDF checksums, 876 source occurrences, 871 objective records, four explicit gaps, preserved malformed/duplicate codes and no fabricated approvals");

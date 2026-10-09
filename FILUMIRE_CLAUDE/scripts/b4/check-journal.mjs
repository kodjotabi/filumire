/*
 * Payments Phase 2, step 3, B4: compares the applied migration journal (from payment-preflight-readonly.mjs JSON)
 * with a local migrations folder: same count, same created_at (= journal "when") and hash = sha256(file text), in
 * order. Local files only; no database connection.
 *
 * Run: node scripts/b4/check-journal.mjs <preflight.json> <migrations folder> <expected count>
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const [jsonPath, folder, expectedText] = process.argv.slice(2);
const expected = Number(expectedText);
const applied = JSON.parse(readFileSync(jsonPath, "utf8")).migrations;
const journal = JSON.parse(readFileSync(path.join(folder, "meta", "_journal.json"), "utf8")).entries;

const problems = [];
if (applied.length !== expected) problems.push(`database journal has ${applied.length} rows, expected ${expected}`);
applied.forEach((row, i) => {
  const entry = journal[i];
  if (!entry) return problems.push(`row ${i}: no local journal entry`);
  const text = readFileSync(path.join(folder, `${entry.tag}.sql`), "utf8");
  const hash = createHash("sha256").update(text).digest("hex");
  if (String(row.created_at) !== String(entry.when)) problems.push(`row ${i} ${entry.tag}: created_at ${row.created_at} != when ${entry.when}`);
  if (row.hash !== hash) problems.push(`row ${i} ${entry.tag}: hash ${row.hash.slice(0, 8)}… != file ${hash.slice(0, 8)}…`);
});
if (problems.length > 0) {
  console.error(`JOURNAL MISMATCH:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`OK: ${applied.length} applied migrations match ${folder} (count, created_at, sha256).`);

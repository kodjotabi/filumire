/*
 * Payments Phase 2, step 3, B3: canonical purchase text + hash vectors.
 * TypeScript side only (no database, no network). PostgreSQL parity is NOT
 * proven here: scripts/sql/payment-hash-parity-check.sql must run on
 * filumire_test after 0019 (B4). This test checks that:
 * - TypeScript reproduces every recorded vector, refuses every invalid one;
 * - the base vector matches a hand-written literal (independent of the fixture);
 * - the generated parity SQL is up to date with the fixture and read-only;
 * - the regexes in the 0019 SQL are character-for-character the TS patterns.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  BLANK_TEXT_PATTERN,
  CANONICAL_LEARNER_ID_PATTERN,
  canonicalPurchaseText,
  OBLIGATION_ID_PATTERN,
  PaymentError,
  PRODUCT_CODE_PATTERN,
  PRODUCT_VERSION_PATTERN,
} from "../packages/payments";
import { purchaseSnapshotHash } from "../services/payments";
import { buildParitySql, loadFixture, PARITY_SQL_PATH } from "../scripts/generate-payment-hash-parity-sql";

let networkCalls = 0;
globalThis.fetch = (async () => {
  networkCalls += 1;
  throw new Error("Network access is not allowed in payment tests.");
}) as typeof fetch;

const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const fixture = loadFixture() as ReturnType<typeof loadFixture> & {
  valid: Array<{ name: string; sameAs?: string; differsFrom?: string; input: Record<string, unknown> & { termsJson: string }; expected: { canonicalText: string; sha256: string } }>;
  formatting: Array<{ name: string; sameAsTs: string; input: Record<string, unknown> & { termsJson: string }; tsExpected: { canonicalText: string; sha256: string } }>;
};
type Input = { termsJson: string };
const fields = (input: Input) => ({ ...(input as object), productTerms: JSON.parse(input.termsJson) }) as unknown as Parameters<typeof canonicalPurchaseText>[0];

const checks: string[] = [];
function check(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`Check failed: ${name}`);
    throw error;
  }
  checks.push(name);
}

check("handWrittenBaseLiteral", () => {
  const literal =
    '"v1"|"obl_0123456789abcdef0123456789abcdef"|"pr_payer_001"|"sandbox_monthly"|"2026.10"|"FILUMIRE monthly (sandbox)"|' +
    '"{\\"months\\":1,\\"subjects\\":[\\"english\\",\\"maths\\"]}"|"2500"|"GHS"|"sandbox"|"lrn_a,lrn_b"';
  const base = fixture.valid.find((v) => v.name === "base")!;
  assert.equal(canonicalPurchaseText(fields(base.input)), literal);
  assert.equal(base.expected.canonicalText, literal);
  assert.equal(base.expected.sha256, sha256(literal));
  const sort = fixture.valid.find((v) => v.name === "learner_ascii_sort")!;
  assert.ok(sort.expected.canonicalText.endsWith('|"0a,ABC,Zed,_x,abc"'), "ASCII byte order");
  const esc = fixture.valid.find((v) => v.name === "escaping_label")!;
  assert.ok(esc.expected.canonicalText.includes('tab\\t nl\\n cr\\r bs\\b ff\\f ctl\\u0001 us\\u001f del\u007f'), "JSON.stringify escapes");
});

check("everyValidVectorReproduced", () => {
  assert.ok(fixture.valid.length >= 30);
  const byName = new Map(fixture.valid.map((v) => [v.name, v.expected.sha256]));
  for (const v of fixture.valid) {
    const text = canonicalPurchaseText(fields(v.input));
    assert.equal(text, v.expected.canonicalText, v.name);
    assert.equal(sha256(text), v.expected.sha256, v.name);
    assert.equal(purchaseSnapshotHash(fields(v.input)), v.expected.sha256, v.name);
    if (v.sameAs) assert.equal(v.expected.sha256, byName.get(v.sameAs), `${v.name} sameAs ${v.sameAs}`);
    if (v.differsFrom) assert.notEqual(v.expected.sha256, byName.get(v.differsFrom), `${v.name} differsFrom ${v.differsFrom}`);
  }
});

check("everyInvalidVectorRefused", () => {
  assert.ok(fixture.invalid.length >= 30);
  for (const v of fixture.invalid) {
    let code = "accepted";
    try {
      canonicalPurchaseText(fields(v.input as Input));
    } catch (error) {
      code = error instanceof PaymentError ? error.code : `other:${(error as Error).message}`;
    }
    assert.equal(code, "INVALID_OBLIGATION", v.name);
  }
});

check("formattingVectorsNormaliseInTypeScript", () => {
  const byName = new Map(fixture.valid.map((v) => [v.name, v.expected.sha256]));
  for (const v of fixture.formatting) {
    assert.equal(purchaseSnapshotHash(fields(v.input)), v.tsExpected.sha256, v.name);
    assert.equal(v.tsExpected.sha256, byName.get(v.sameAsTs), `${v.name} ~ ${v.sameAsTs}`);
  }
});

check("paritySqlIsCurrentAndReadOnly", () => {
  const onDisk = readFileSync(PARITY_SQL_PATH, "utf8");
  assert.equal(onDisk, buildParitySql(fixture), "regenerate: npx tsx scripts/generate-payment-hash-parity-sql.ts");
  assert.match(onDisk, /^BEGIN;\nSET TRANSACTION READ ONLY;\n/m);
  assert.match(onDisk, /\nROLLBACK;\n$/);
  assert.match(onDisk, /current_database\(\) <> 'filumire_test'/);
  const code = onDisk.split("\n").filter((l) => !l.trimStart().startsWith("--"));
  for (const line of code) {
    assert.doesNotMatch(line, /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|TRUNCATE|GRANT|COMMIT)\b/i, line);
  }
  assert.equal((onDisk.match(/-- valid: /g) ?? []).length, fixture.valid.length);
  assert.equal((onDisk.match(/-- invalid: /g) ?? []).length, fixture.invalid.length);
});

check("sqlPatternsMatchTypeScript", () => {
  const hand = readFileSync("migration-review/0019/0019_hand_written.sql", "utf8");
  const migration = readFileSync("migration-review/0019/drizzle/0019_payment_obligations.sql", "utf8");
  for (const pattern of [OBLIGATION_ID_PATTERN, PRODUCT_CODE_PATTERN, PRODUCT_VERSION_PATTERN, CANONICAL_LEARNER_ID_PATTERN, BLANK_TEXT_PATTERN]) {
    assert.ok(hand.includes(`'${pattern.source}'`), `hand-written SQL uses ${pattern.source}`);
  }
  assert.ok(hand.includes("'^[A-Za-z][A-Za-z0-9_]{0,63}$'"), "term key pattern");
  assert.ok(migration.includes(`'${BLANK_TEXT_PATTERN.source}'`), "label CHECK uses the same blank class");
  assert.ok(hand.includes("9007199254740991") && hand.includes("COLLATE \"C\""));
  assert.ok(hand.includes("to_json('v1'::text)::text"), "canonical version v1");
});

console.log({ paymentCanonicalVectors: "PASS", checks: checks.length, valid: fixture.valid.length, invalid: fixture.invalid.length, formatting: fixture.formatting.length, networkCalls });

/*
 * Builds tests/fixtures/payment-canonical-vectors.json (Payments Phase 2, step 3, B3).
 *
 * Inputs are defined here; expected canonical text + sha256 are recorded from
 * the CURRENT TypeScript implementation. Re-running this after changing the
 * canonical form re-blesses the fixture, so any diff in the fixture must be
 * reviewed (and the 0019 SQL functions changed to match) before it is kept.
 * Hand-written literals in tests/payment-canonical-vectors.test.ts guard the
 * base vector independently of this file.
 *
 *   npx tsx scripts/build-payment-canonical-vectors.ts
 *
 * No database, no network.
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { canonicalPurchaseText, PaymentError } from "../packages/payments";

interface VectorInput {
  id: string;
  payerPrincipalId: string;
  productCode: string;
  productVersion: string;
  productLabel: string;
  /* Raw JSON source text (parsed by JSON.parse in TS, cast ::jsonb in SQL). */
  termsJson: string;
  /* A number, or a string for values that must reach SQL exactly as written. */
  amountMinor: number;
  currency: string;
  mode: string;
  learnerIds: string[];
}

const base: VectorInput = {
  id: "obl_0123456789abcdef0123456789abcdef",
  payerPrincipalId: "pr_payer_001",
  productCode: "sandbox_monthly",
  productVersion: "2026.10",
  productLabel: "FILUMIRE monthly (sandbox)",
  termsJson: '{"months":1,"subjects":["english","maths"]}',
  amountMinor: 2500,
  currency: "GHS",
  mode: "sandbox",
  learnerIds: ["lrn_b", "lrn_a"],
};

const v = (patch: Partial<VectorInput>): VectorInput => ({ ...base, ...patch });
const twenty = Array.from({ length: 20 }, (_, i) => `lrn_${String(i).padStart(2, "0")}`);

/* sameAs: must hash identically to that vector. differsFrom: must not. */
const valid: Array<{ name: string; input: VectorInput; sameAs?: string; differsFrom?: string; note?: string }> = [
  { name: "base", input: base },
  { name: "beneficiary_order_reversed", input: v({ learnerIds: ["lrn_a", "lrn_b"] }), sameAs: "base" },
  { name: "terms_key_order_changed", input: v({ termsJson: '{"subjects":["english","maths"],"months":1}' }), sameAs: "base" },
  { name: "terms_whitespace_changed", input: v({ termsJson: '{ "months" : 1 ,\n\t"subjects" : [ "english" , "maths" ] }' }), sameAs: "base" },
  { name: "amount_changed", input: v({ amountMinor: 2501 }), differsFrom: "base" },
  { name: "product_version_changed", input: v({ productVersion: "2026.11" }), differsFrom: "base" },
  { name: "product_code_changed", input: v({ productCode: "sandbox_termly" }), differsFrom: "base" },
  { name: "terms_value_changed", input: v({ termsJson: '{"months":2,"subjects":["english","maths"]}' }), differsFrom: "base" },
  { name: "terms_array_order_matters", input: v({ termsJson: '{"months":1,"subjects":["maths","english"]}' }), differsFrom: "base" },
  { name: "beneficiary_removed", input: v({ learnerIds: ["lrn_a"] }), differsFrom: "base" },
  { name: "mode_live", input: v({ mode: "live" }), differsFrom: "base", note: "canonical form allows live; 0019 refuses live obligations by CHECK" },
  { name: "amount_min", input: v({ amountMinor: 1 }) },
  { name: "amount_int4_max", input: v({ amountMinor: 2147483647 }) },
  { name: "terms_safe_integer_max", input: v({ termsJson: '{"n":9007199254740991}' }) },
  { name: "terms_safe_integer_min", input: v({ termsJson: '{"n":-9007199254740991}' }) },
  { name: "terms_zero", input: v({ termsJson: '{"n":0}' }) },
  { name: "terms_empty_object", input: v({ termsJson: "{}" }) },
  { name: "terms_nested", input: v({ termsJson: '{"z":[],"a":{"b":[1,{"e":false,"c":null,"d":true}],"o":{}}}' }) },
  {
    name: "escaping_label",
    input: v({ productLabel: 'Quote " backslash \\ slash / tab\t nl\n cr\r bs\b ff\f ctl\u0001 us\u001f del\u007f' }),
  },
  { name: "escaping_terms_string", input: v({ termsJson: JSON.stringify({ note: '"\\/\t\n\u001f\u007f\u2028\u2029' }) }) },
  { name: "unicode_label_nfc", input: v({ productLabel: "F\u00e9e \u2014 \u6570\u5b66 \u{1F9EE} \u0186\u025b" }) },
  { name: "unicode_payer_nfc", input: v({ payerPrincipalId: "pr\u00efncipal-\u0190" }) },
  { name: "unicode_terms_astral", input: v({ termsJson: JSON.stringify({ icon: "\u{1F9EE}", name: "\u0254\u025b" }) }) },
  { name: "separator_in_payer", input: v({ payerPrincipalId: 'payer"|"x,y' }) },
  { name: "learner_id_punctuation", input: v({ learnerIds: ["a.b_c:d-e", "A-1"] }) },
  { name: "learner_ascii_sort", input: v({ learnerIds: ["abc", "_x", "Zed", "ABC", "0a"] }), note: "C/UTF-16 order: 0a, ABC, Zed, _x, abc" },
  { name: "learners_max_20", input: v({ learnerIds: [...twenty].reverse() }) },
  { name: "label_max_120", input: v({ productLabel: "L".repeat(120) }) },
  { name: "payer_max_200", input: v({ payerPrincipalId: "p".repeat(200) }) },
  { name: "label_120_astral_code_points", input: v({ productLabel: "\u{1F9EE}".repeat(120) }), note: "length counts code points (PostgreSQL length())" },
  { name: "payer_200_astral_code_points", input: v({ payerPrincipalId: "\u{1F9EE}".repeat(200) }) },
  { name: "label_inner_whitespace", input: v({ productLabel: "\u3000a\u00a0" }), note: "not blank: contains a non-whitespace character" },
  { name: "label_zero_width_space", input: v({ productLabel: "\u200b" }), note: "U+200B is not trim() whitespace" },
];

/* Both TypeScript and SQL must refuse these. */
const invalid: Array<{ name: string; input: VectorInput; why: string }> = [
  { name: "learner_with_comma", input: v({ learnerIds: ["lrn_a,lrn_b"] }), why: "',' is the list separator" },
  { name: "learner_non_ascii", input: v({ learnerIds: ["lrn_\u00e9"] }), why: "sort order differs between UTF-16 and bytes outside ASCII" },
  { name: "learner_duplicate", input: v({ learnerIds: ["lrn_a", "lrn_a"] }), why: "duplicate beneficiary" },
  { name: "learners_empty", input: v({ learnerIds: [] }), why: "at least one beneficiary" },
  { name: "learners_21", input: v({ learnerIds: [...twenty, "lrn_20"] }), why: "at most 20 beneficiaries" },
  { name: "learner_empty_string", input: v({ learnerIds: [""] }), why: "empty id" },
  { name: "amount_zero", input: v({ amountMinor: 0 }), why: "positive" },
  { name: "amount_negative", input: v({ amountMinor: -1 }), why: "positive" },
  { name: "amount_over_int4", input: v({ amountMinor: 2147483648 }), why: "amount_minor is integer (int4)" },
  { name: "amount_fraction", input: v({ amountMinor: 25.5 }), why: "integer minor units" },
  { name: "label_nfd", input: v({ productLabel: "Fe\u0301e" }), why: "not NFC" },
  { name: "label_nul", input: v({ productLabel: "a\u0000b" }), why: "PostgreSQL text cannot hold U+0000" },
  { name: "label_lone_high_surrogate", input: v({ productLabel: "a\ud800b" }), why: "unpaired surrogate" },
  { name: "label_lone_low_surrogate", input: v({ productLabel: "a\udc00" }), why: "unpaired surrogate" },
  { name: "label_blank", input: v({ productLabel: "   " }), why: "blank" },
  { name: "label_121", input: v({ productLabel: "L".repeat(121) }), why: "over 120" },
  { name: "label_121_astral_code_points", input: v({ productLabel: "\u{1F9EE}".repeat(121) }), why: "over 120 code points" },
  { name: "label_tab_only", input: v({ productLabel: "\t" }), why: "blank (btrim() alone would keep it)" },
  { name: "label_ideographic_space_only", input: v({ productLabel: "\u3000\u00a0\ufeff" }), why: "blank" },
  { name: "payer_201_astral_code_points", input: v({ payerPrincipalId: "\u{1F9EE}".repeat(201) }), why: "over 200 code points" },
  { name: "payer_empty", input: v({ payerPrincipalId: "" }), why: "empty" },
  { name: "payer_201", input: v({ payerPrincipalId: "p".repeat(201) }), why: "over 200" },
  { name: "payer_nfd", input: v({ payerPrincipalId: "pe\u0301" }), why: "not NFC" },
  { name: "terms_string_nfd", input: v({ termsJson: '{"s":"e\\u0301"}' }), why: "not NFC" },
  { name: "terms_lone_surrogate", input: v({ termsJson: '{"s":"\\udc00"}' }), why: "unpaired surrogate" },
  { name: "terms_nul", input: v({ termsJson: '{"s":"\\u0000"}' }), why: "jsonb cannot hold U+0000" },
  { name: "terms_fraction", input: v({ termsJson: '{"n":2.5}' }), why: "integers only" },
  { name: "terms_unsafe_integer", input: v({ termsJson: '{"n":9007199254740992}' }), why: "beyond 2^53-1" },
  { name: "terms_key_space", input: v({ termsJson: '{"bad key":1}' }), why: "keys are ASCII identifiers" },
  { name: "terms_key_digit_first", input: v({ termsJson: '{"1a":1}' }), why: "keys are ASCII identifiers" },
  { name: "terms_key_non_ascii", input: v({ termsJson: '{"\u00e9":1}' }), why: "keys are ASCII identifiers" },
  { name: "terms_top_level_array", input: v({ termsJson: "[1]" }), why: "terms must be an object" },
  { name: "terms_top_level_null", input: v({ termsJson: "null" }), why: "terms must be an object" },
  { name: "product_code_uppercase", input: v({ productCode: "Sandbox_monthly" }), why: "pattern" },
  { name: "product_code_separator", input: v({ productCode: "sandbox_a|t1" }), why: "pattern" },
  { name: "product_version_space", input: v({ productVersion: "v 1" }), why: "pattern" },
  { name: "currency_lowercase", input: v({ currency: "ghs" }), why: "pattern" },
  { name: "mode_unknown", input: v({ mode: "test" }), why: "sandbox or live" },
  { name: "obligation_id_separator", input: v({ id: "obl|1" }), why: "pattern" },
];

/*
 * JSON source spellings where TypeScript (JSON.parse) and PostgreSQL (::jsonb)
 * may legitimately differ. The application never sends these spellings (node-pg
 * sends JSON.stringify output), but direct SQL could. sqlExpected is the
 * PREDICTED PostgreSQL behaviour and must be confirmed in B4.
 */
const formatting: Array<{ name: string; input: VectorInput; sameAsTs: string; sqlExpected: "same_hash" | "refused"; why: string }> = [
  { name: "number_exponent", input: v({ termsJson: '{"n":1e3}' }), sameAsTs: "terms_n_1000", sqlExpected: "same_hash", why: "jsonb stores 1e3 as numeric 1000 (scale 0)" },
  { name: "number_negative_zero", input: v({ termsJson: '{"n":-0}' }), sameAsTs: "terms_zero", sqlExpected: "same_hash", why: "numeric has no negative zero" },
  { name: "number_trailing_zero", input: v({ termsJson: '{"n":1.0}' }), sameAsTs: "terms_n_1", sqlExpected: "refused", why: "jsonb keeps 1.0; SQL accepts integer spellings only" },
  { name: "number_upper_exponent_fraction", input: v({ termsJson: '{"n":10E-1}' }), sameAsTs: "terms_n_1", sqlExpected: "refused", why: "jsonb keeps 1.0" },
  { name: "string_escaped_solidus", input: v({ termsJson: '{"s":"a\\/b"}' }), sameAsTs: "terms_s_a_slash_b", sqlExpected: "same_hash", why: "\\/ decodes to / on both sides" },
  { name: "string_unicode_escape", input: v({ termsJson: '{"s":"\\u00e9"}' }), sameAsTs: "terms_s_e_acute", sqlExpected: "same_hash", why: "\\u00e9 decodes to U+00E9 on both sides" },
  { name: "duplicate_key_last_wins", input: v({ termsJson: '{"n":1,"n":2}' }), sameAsTs: "terms_n_2", sqlExpected: "same_hash", why: "JSON.parse and jsonb both keep the last value" },
];

/* Reference vectors that the formatting vectors are compared with. */
valid.push(
  { name: "terms_n_1000", input: v({ termsJson: '{"n":1000}' }) },
  { name: "terms_n_1", input: v({ termsJson: '{"n":1}' }) },
  { name: "terms_n_2", input: v({ termsJson: '{"n":2}' }) },
  { name: "terms_s_a_slash_b", input: v({ termsJson: '{"s":"a/b"}' }) },
  { name: "terms_s_e_acute", input: v({ termsJson: '{"s":"\u00e9"}' }) },
);

function fields(input: VectorInput) {
  return { ...input, mode: input.mode as "sandbox", productTerms: JSON.parse(input.termsJson) };
}

function compute(input: VectorInput): { canonicalText: string; sha256: string } {
  const canonicalText = canonicalPurchaseText(fields(input));
  return { canonicalText, sha256: createHash("sha256").update(canonicalText, "utf8").digest("hex") };
}

function refused(input: VectorInput): boolean {
  try {
    compute(input);
    return false;
  } catch (error) {
    if (error instanceof PaymentError && error.code === "INVALID_OBLIGATION") return true;
    throw error;
  }
}

const out = {
  description:
    "Payments Phase 2 step 3 B3: canonical purchase text + sha256 vectors. TypeScript results recorded by scripts/build-payment-canonical-vectors.ts; PostgreSQL parity is checked by scripts/sql/payment-hash-parity-check.sql (B4, after 0019).",
  canonicalVersion: "v1",
  valid: valid.map((x) => ({ ...x, expected: compute(x.input) })),
  invalid: invalid.map((x) => {
    if (!refused(x.input)) throw new Error(`invalid vector accepted by TypeScript: ${x.name}`);
    return x;
  }),
  formatting: formatting.map((x) => ({ ...x, tsExpected: compute(x.input) })),
};

writeFileSync("tests/fixtures/payment-canonical-vectors.json", `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log({ valid: out.valid.length, invalid: out.invalid.length, formatting: out.formatting.length });

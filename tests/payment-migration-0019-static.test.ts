/*
 * Payments Phase 2, step 3, B3: static review checks for the staged migration
 * 0019 and its test-database reversal script. Reads files only: no database,
 * no network. Proves structure, NOT that PostgreSQL accepts or enforces it (B4).
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import {
  canTransitionObligation,
  FINANCIAL_EXCEPTION_KINDS,
  NON_RECEIPT_FAILURES,
  OBLIGATION_STATUSES,
  receiptCandidate,
} from "../packages/payments";

const BREAK = "--> statement-breakpoint";
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");
const staged = read("migration-review/0019/drizzle/0019_payment_obligations.sql");
const hand = read("migration-review/0019/0019_hand_written.sql");
const precondition = read("migration-review/0019/0019_precondition.sql");
const reverse = read("migration-review/0019/0019_reverse_filumire_test_only.sql");
const ledger = read("services/payments/obligations/postgres-ledger.ts");
const statements = staged.split(BREAK).map((s) => s.trim());
const indexOf = (needle: string) => statements.findIndex((s) => s.includes(needle));

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

check("notAppliedOrQueuedInRealMigrationsFolder", () => {
  const journal = JSON.parse(read("drizzle/meta/_journal.json")) as { entries: Array<{ tag: string }> };
  assert.equal(journal.entries.length, 19, "drizzle/ journal must stay at 19 entries in B3");
  assert.ok(!readdirSync("drizzle").some((f) => f.startsWith("0019")), "no 0019 file in ./drizzle");
  assert.ok(!existsSync("drizzle/meta/0019_snapshot.json"));
  const staging = JSON.parse(read("migration-review/0019/drizzle/meta/_journal.json")) as { entries: Array<{ tag: string; when: number }> };
  assert.equal(staging.entries.at(-1)!.tag, "0019_payment_obligations");
  assert.ok(reverse.includes(String(staging.entries.at(-1)!.when)), "reversal identifies the journal row by created_at");
});

check("assembledFromReviewedParts", () => {
  assert.ok(staged.includes(precondition.trimEnd()), "precondition verbatim");
  assert.ok(staged.includes(hand.trimEnd()), "hand-written part verbatim");
  assert.ok(indexOf("LOCK TABLE") < indexOf("CREATE TABLE"), "precondition first");
  assert.ok(indexOf("0019 refused") < indexOf("CREATE TABLE"), "empty-table check before any change");
  assert.match(precondition, /server_encoding/);
});

check("statementOrderIsValid", () => {
  const unique = indexOf('ADD CONSTRAINT "payment_attempts_obligation_binding_unique"');
  assert.ok(unique >= 0 && unique < indexOf('"payment_receipts_attempt_fk"'), "binding UNIQUE before the FK that references it");
  assert.ok(indexOf('CONSTRAINT "payment_receipts_settlement_binding_unique"') < indexOf('"payment_obligations_settlement_fk"'));
  assert.ok(indexOf('CONSTRAINT "payment_obligations_binding_unique"') < indexOf('"payment_attempts_obligation_fk"'));
  for (const fn of ["payment_canonical_json", "payment_purchase_canonical_text", "payment_purchase_hash", "payment_obligation_hash"]) {
    assert.ok(indexOf(`CREATE FUNCTION "${fn}"`) < indexOf('CREATE FUNCTION "payment_obligations_seal_check"'), fn);
  }
});

check("additiveOnlyForExistingTables", () => {
  for (const s of statements) {
    assert.doesNotMatch(s, /^\s*(DROP|TRUNCATE|DELETE|UPDATE|INSERT)\b/im, s.slice(0, 80));
    const altered = /ALTER TABLE "(\w+)"/.exec(s)?.[1];
    if (altered && !altered.startsWith("payment_obligation") && !["payment_receipts", "payment_exceptions"].includes(altered)) {
      assert.equal(altered, "payment_attempts", `only payment_attempts among existing tables is altered: ${altered}`);
      assert.match(s, /ADD CONSTRAINT/, "existing tables only gain constraints");
    }
  }
  assert.doesNotMatch(staged, /ALTER TABLE "(principals|learners|principal_learner_access)"/);
});

check("financialAndSandboxConstraintsPresent", () => {
  for (const needle of [
    `"payment_obligations_sandbox_only_check" CHECK ("payment_obligations"."mode" = 'sandbox')`,
    '"payment_receipts_provider_charge_unique" UNIQUE("provider","mode","merchant_context","provider_reference")',
    '"payment_receipts_attempt_unique" UNIQUE("attempt_id")',
    '"payment_obligations_settled_receipt_unique" UNIQUE("settled_receipt_id")',
    'CREATE UNIQUE INDEX "payment_obligation_events_one_settlement"',
    '"payment_exceptions_dedupe_unique" UNIQUE("obligation_id","kind","dedupe_key")',
    "DEFERRABLE INITIALLY IMMEDIATE",
    "CREATE CONSTRAINT TRIGGER \"payment_obligations_seal_check\"",
    "CREATE CONSTRAINT TRIGGER \"payment_attempts_outcome_check\"",
  ]) {
    assert.ok(staged.includes(needle), needle);
  }
  for (const kind of FINANCIAL_EXCEPTION_KINDS) assert.ok(staged.includes(`'${kind}'`), `exception kind ${kind} in CHECK`);
});

check("everyNewTableGuarded", () => {
  for (const table of ["payment_obligations", "payment_obligation_beneficiaries", "payment_receipts", "payment_exceptions", "payment_obligation_events"]) {
    const trigger = new RegExp(`CREATE TRIGGER "\\w+" BEFORE [A-Z OR]*DELETE[A-Z OR]* ON "${table}"`);
    assert.match(hand, trigger, `${table} has a guard on DELETE`);
  }
  const guards = hand.split("CREATE FUNCTION").filter((f) => f.includes("TG_OP = 'DELETE'"));
  assert.equal(guards.length, 5);
  for (const g of guards) assert.match(g, /payment_test_cleanup_allowed\(\)/, "deletes only through the 0018 test clean-up flag");
  assert.match(hand, /BEFORE INSERT ON "payment_attempts"/);
  assert.match(hand, /NEW\.status <> 'created'/, "no attempt can be inserted already succeeded");
});

check("everyCustomSqlstateHandled", () => {
  const raised = new Set([...hand.matchAll(/ERRCODE = '(PF\d{3})'/g)].map((m) => m[1]));
  assert.deepEqual([...raised].sort(), ["PF001", "PF002", "PF003", "PF004", "PF005", "PF006", "PF007", "PF008", "PF009", "PF010"]);
  for (const code of ["PF001", "PF002", "PF003", "PF004", "PF005", "PF006", "PF010"]) assert.ok(ledger.includes(`"${code}"`), `ledger maps ${code}`);
  assert.match(ledger, /PF007-PF009 mean a broken invariant/);
});

check("reversalScriptCoversEverything", () => {
  assert.match(reverse, /current_database\(\) <> 'filumire_test'/);
  assert.match(reverse, /payment tables hold rows \(forward fix only\)/);
  assert.match(reverse, /^BEGIN ISOLATION LEVEL READ COMMITTED;/m);
  assert.match(reverse, /^COMMIT;/m);
  assert.doesNotMatch(reverse.replace(/--.*$/gm, ""), /CASCADE/);
  const functions = [...hand.matchAll(/CREATE FUNCTION "(\w+)"/g)].map((m) => m[1]);
  for (const fn of functions) assert.ok(reverse.includes(`DROP FUNCTION "public"."${fn}"`), `reversal drops ${fn}`);
  for (const t of ["payment_attempts_obligation_guard", "payment_attempts_outcome_check", "payment_attempt_events_insert_guard"]) {
    assert.ok(reverse.includes(`DROP TRIGGER "${t}"`), `reversal drops trigger ${t}`);
  }
  for (const c of ["payment_attempts_obligation_fk", "payment_attempts_obligation_binding_unique"]) assert.ok(reverse.includes(`DROP CONSTRAINT "${c}"`));
  for (const t of ["payment_exceptions", "payment_obligation_events", "payment_obligation_beneficiaries", "payment_receipts", "payment_obligations"]) {
    assert.ok(reverse.includes(`"${t}"`), `reversal drops ${t}`);
  }
  assert.doesNotMatch(reverse, /payment_test_cleanup_allowed"?\(\)\s*;/, "0018 objects untouched");
});

/* ---------- B3 SQL hardening (9 Oct 2026): review findings F1-F4 ---------- */
const reverseCode = reverse.replace(/--.*$/gm, "");
const reverseStatements = reverseCode.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
const reverseIndex = (needle: string) => reverseStatements.findIndex((s) => s.includes(needle));
const constraintNames = (sql: string) => [...sql.matchAll(/CONSTRAINT "(\w+)"/g)].map((m) => m[1]);
const migration0018 = read("drizzle/0018_payment_attempts.sql");

check("F1ReversalPostCheckNamesOnly0019Constraints", () => {
  assert.doesNotMatch(reverseCode, /\bLIKE\b/i, "no pattern match on object names in the reversal");
  const checked = /conname IN \(([^)]*)\)/.exec(reverseCode)?.[1] ?? "";
  const names = [...checked.matchAll(/'(\w+)'/g)].map((m) => m[1]).sort();
  assert.deepEqual(names, ["payment_attempts_obligation_binding_unique", "payment_attempts_obligation_fk"]);
  // Every name checked was created by 0019 on payment_attempts, and none belongs to 0018.
  const created0019 = constraintNames(staged);
  const created0018 = constraintNames(migration0018);
  assert.ok(created0018.includes("payment_attempts_obligation_check"), "0018 constraint the old LIKE pattern matched");
  for (const n of names) {
    assert.ok(created0019.includes(n), `${n} is created by 0019`);
    assert.ok(!created0018.includes(n), `${n} is not a 0018 constraint`);
  }
  assert.match(reverseCode, /'payment_attempts_obligation_check'/, "post-check asserts the 0018 constraint survives");
  assert.match(reverseCode, /IS DISTINCT FROM ARRAY\['payment_attempts_guard'\]/, "post-check asserts the 0018 trigger survives");
});

check("F2ReversalLocksBeforeCheckingAndStaysAtomic", () => {
  assert.equal(reverseStatements[0], "BEGIN ISOLATION LEVEL READ COMMITTED", "explicit READ COMMITTED: fresh snapshot after the locks");
  const tables = ["payment_obligations", "payment_attempts", "payment_obligation_beneficiaries", "payment_receipts",
    "payment_exceptions", "payment_obligation_events", "payment_attempt_events"];
  const lock = reverseStatements[reverseIndex('LOCK TABLE "public"."payment_obligations"')];
  assert.ok(lock && /IN ACCESS EXCLUSIVE MODE$/.test(lock), "payment tables locked ACCESS EXCLUSIVE");
  for (const t of tables) assert.ok(lock.includes(`"public"."${t}"`), `${t} locked`);
  const journalLock = reverseIndex("LOCK TABLE drizzle.__drizzle_migrations");
  const emptiness = reverseIndex("payment tables hold rows");
  assert.ok(reverseIndex('LOCK TABLE "public"."payment_obligations"') < emptiness, "tables locked before the emptiness check");
  assert.ok(journalLock >= 0 && journalLock < reverseIndex("not the single latest applied migration"), "journal locked before it is checked");
  const destructive = reverseStatements.filter((s) => /^(DROP|ALTER|DELETE)\b/.test(s));
  assert.ok(destructive.length > 0);
  for (const s of destructive) assert.ok(reverseStatements.indexOf(s) > emptiness, `after the checks: ${s.slice(0, 60)}`);
  assert.equal(reverseStatements.filter((s) => /^BEGIN\b/.test(s)).length, 1, "one transaction");
  assert.equal(reverseStatements.filter((s) => /^(COMMIT|ROLLBACK|END TRANSACTION)$/.test(s)).length, 1, "one COMMIT, no early end");
  assert.equal(reverseStatements.at(-1), "COMMIT");
  assert.ok(reverseIndex("post-check failed") > reverseIndex("DELETE FROM drizzle.__drizzle_migrations"), "post-checks run before COMMIT");
});

check("F3FunctionsPinSearchPathAndSchemaIsChecked", () => {
  const PIN = "SET search_path = pg_catalog, public, pg_temp";
  const functions = hand.split(/(?=CREATE FUNCTION )/).filter((f) => f.startsWith("CREATE FUNCTION"));
  assert.equal(functions.length, 17);
  for (const f of functions) {
    const header = f.slice(0, f.indexOf("$$"));
    assert.ok(header.includes(PIN), `search_path pinned: ${f.slice(0, 60)}`);
    assert.doesNotMatch(header, /SECURITY DEFINER/, "functions stay SECURITY INVOKER");
  }
  assert.match(precondition, /current_schema\(\) IS DISTINCT FROM 'public'/, "0019 refuses a non-public creation schema");
  assert.ok(indexOf("current_schema()") < indexOf("CREATE TABLE"), "schema check before any change");
  // The generated part targets public explicitly in every FK.
  for (const s of statements.filter((x) => x.includes("REFERENCES"))) assert.match(s, /REFERENCES "public"\./);
  assert.match(reverseCode, /SET LOCAL search_path = pg_catalog, public, pg_temp/);
});

/* Text of one hand-written function, from its CREATE FUNCTION to the next statement break. */
const fnText = (name: string) => {
  const start = hand.indexOf(`CREATE FUNCTION "${name}"`);
  assert.ok(start >= 0, `function ${name} exists`);
  return hand.slice(start, hand.indexOf(BREAK, start));
};
const outcomeAssert = fnText("payment_attempt_outcome_assert");
/* The failure codes in a function's `?| ARRAY[...]` test. */
const sqlFailureList = (fn: string) => [...(/\?\| ARRAY\[([^\]]*)\]/.exec(fn)?.[1] ?? "").matchAll(/'(\w+)'/g)].map((m) => m[1]);

check("F4LateSuccessNeedsReceiptReviewAndException", () => {
  const fn = outcomeAssert;
  assert.match(fn, /a\.status = 'needs_review' AND receipt_id IS NULL AND a\.observed_status = 'successful'/, "identifiable late success needs a receipt");
  assert.match(fn, /receipt_id IS NOT NULL AND o\.status NOT IN \('settled', 'review'\)/, "a receipt on an unsettled purchase means review");
  assert.match(fn, /o\.status = 'open'/, "outcome applied (unchanged rule)");
  assert.match(fn, /\(receipt_id IS NULL OR o\.settled_receipt_id IS DISTINCT FROM receipt_id\) AND NOT EXISTS/, "only the settling attempt is exempt");
  assert.match(fn, /e\.attempt_id = a\.id AND e\.obligation_id = a\.obligation_id AND \(o\.status = 'settled' OR e\.blocks_fulfilment\)/);
  // The Postgres ledger writes one exception per (obligation, kind, attempt): dedupe_key is the attempt id.
  assert.match(ledger, /VALUES \(\$1, \$2, \$3, \$4, \$5, \$6, \$3, 'open', \$7, 'system'\)/, "exception dedupe_key = attempt id");
});

const store = read("services/payments/store/postgres.ts");
const verification = read("packages/payments/verification.ts");

/* ---------- B3 receipt integrity closeout (9 Oct 2026) ---------- */
check("ReceiptInsertRefusesNonReceiptFailuresLikeReceiptCandidate", () => {
  const guard = fnText("payment_receipts_guard");
  const guardList = sqlFailureList(guard);
  assert.deepEqual(guardList, sqlFailureList(outcomeAssert), "receipt guard list = outcome assert list (same order)");
  assert.deepEqual([...guardList].sort(), [...NON_RECEIPT_FAILURES].sort(), "receipt guard list = NON_RECEIPT_FAILURES");
  assert.match(guard, /IF coalesce\(a\.verification_failures, '\[\]'::jsonb\) \?\| ARRAY\[[^\]]*\] THEN\s+RAISE EXCEPTION '[^']*', a\.id USING ERRCODE = 'PF007';\s+END IF;/,
    "the guard refuses (PF007) when the attempt carries any listed failure");
  // INSERT path only: UPDATE / DELETE return or raise before it, so existing receipts are never re-judged.
  assert.ok(guard.indexOf("TG_OP = 'UPDATE'") < guard.indexOf("?| ARRAY["), "after the UPDATE / DELETE branches");
  // The other receiptCandidate conditions are already enforced on every receipt INSERT: the guard compares
  // observed_status / provider_reference / amount / currency with NEW, and the table CHECKs bound those columns.
  assert.match(guard, /a\.observed_status IS DISTINCT FROM 'successful'/);
  for (const needle of ['"payment_receipts_provider_reference_check" CHECK (length("payment_receipts"."provider_reference") between 1 and 200)',
    '"payment_receipts_amount_check" CHECK ("payment_receipts"."amount_minor" > 0)',
    `"payment_receipts_currency_check" CHECK ("payment_receipts"."currency" ~ '^[A-Z]{3}$')`]) {
    assert.ok(staged.includes(needle), needle);
  }
  // Behavioural parity with receiptCandidate for every real code, alone and next to an amount / currency failure.
  const union = verification.slice(verification.indexOf("export type VerificationFailure"), verification.indexOf("export type VerificationResult"));
  const codes = [...union.matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]);
  const base = { observedStatus: "successful" as const, observedAmountMinor: 100, observedCurrency: "GHS", providerReference: "ref-1" };
  const sqlRefuses = (failures: string[]) => failures.some((f) => guardList.includes(f));
  for (const failures of [...codes.map((c) => [c]), ...codes.map((c) => ["UNDERPAYMENT", c]), ...codes.map((c) => ["CURRENCY_MISMATCH", c])]) {
    const tsRefuses = receiptCandidate({ ...base, verificationFailures: failures }) === null;
    assert.equal(sqlRefuses(failures), tsRefuses, `receipt insert for [${failures}]`);
  }
  // Mismatch receipts of identifiable charges stay valid (Stage A); settlement rules are unchanged.
  for (const code of ["UNDERPAYMENT", "OVERPAYMENT", "CURRENCY_MISMATCH"]) assert.ok(!guardList.includes(code), `${code} keeps its receipt`);
  assert.equal(sqlRefuses([]), false);
  // The deferred checks never require a receipt the guard refuses: the outcome assert demands one only without
  // these failures, and a succeeded attempt is only written with an empty failure list (recorder: confirmed).
  assert.match(outcomeAssert, /AND NOT \(coalesce\(a\.verification_failures, '\[\]'::jsonb\) \?\| ARRAY\[/);
  assert.match(read("services/payments/recorder.ts"), /const failures = result\.confirmed \? \[\] : result\.failures;/);
  // The ledger inserts only receiptCandidate's output, computed from the attempt row its UPDATE just returned.
  assert.match(ledger, /const candidate = receiptCandidate\(attempt\);\s+if \(!candidate\) return null;/);
  assert.match(store, /const updated = await client\.query\(`UPDATE payment_attempts SET \$\{sets\.join\(", "\)\} WHERE id = \$1 RETURNING \*`/);
});

/* ---------- B3 final corrections (9 Oct 2026): A1, A2, B1, B2, C1, D1 ---------- */

check("A1ReceiptRequiredForEveryIdentifiableSuccessNoDrift", () => {
  const sqlList = sqlFailureList(outcomeAssert);
  // Two copies (receipt-required rule here, receipt-refused rule in payment_receipts_guard); both checked against TS.
  assert.equal((hand.match(/\?\| ARRAY\[/g) ?? []).length, 2, "the failure list appears only in the outcome assert and the receipt guard");
  assert.deepEqual([...sqlList].sort(), [...NON_RECEIPT_FAILURES].sort(), "SQL non-receipt failures = NON_RECEIPT_FAILURES");
  const union = verification.slice(verification.indexOf("export type VerificationFailure"), verification.indexOf("export type VerificationResult"));
  const codes = [...union.matchAll(/"([A-Z_]+)"/g)].map((m) => m[1]);
  assert.ok(codes.length >= 10, "VerificationFailure codes parsed");
  for (const code of sqlList) assert.ok(codes.includes(code), `${code} is a real VerificationFailure`);
  // Behavioural parity: for every failure code, the SQL rule demands a receipt exactly when receiptCandidate makes one.
  const base = { observedStatus: "successful" as const, observedAmountMinor: 100, observedCurrency: "GHS", providerReference: "ref-1" };
  for (const code of codes) {
    const tsReceipt = receiptCandidate({ ...base, verificationFailures: [code] }) !== null;
    assert.equal(tsReceipt, !sqlList.includes(code), `receipt rule for ${code}`);
  }
  for (const code of ["UNDERPAYMENT", "OVERPAYMENT", "CURRENCY_MISMATCH"]) assert.ok(!sqlList.includes(code), `${code} still needs a receipt (Stage A)`);
  assert.notEqual(receiptCandidate({ ...base, verificationFailures: null }), null);
  // The other receiptCandidate conditions are mirrored in SQL and behave as described.
  for (const needle of ["a.observed_status = 'successful'", "a.provider_reference IS NOT NULL AND a.provider_reference <> ''",
    "a.observed_amount_minor > 0", "a.observed_currency ~ '^[A-Z]{3}$'", "coalesce(a.verification_failures, '[]'::jsonb)"]) {
    assert.ok(outcomeAssert.includes(needle), needle);
  }
  assert.equal(receiptCandidate({ ...base, providerReference: "", verificationFailures: [] }), null);
  assert.equal(receiptCandidate({ ...base, observedAmountMinor: 0, verificationFailures: [] }), null);
  assert.equal(receiptCandidate({ ...base, observedCurrency: "ghs", verificationFailures: [] }), null);
  assert.equal(receiptCandidate({ ...base, observedStatus: "failed", verificationFailures: [] }), null);
  // A receipt is still not a settlement: settlement needs a succeeded attempt and the exact composite FK.
  assert.match(fnText("payment_obligations_guard"), /r\.obligation_id = NEW\.id AND a\.status = 'succeeded'/);
  assert.ok(hand.includes('REFERENCES "public"."payment_receipts"("id", "obligation_id", "amount_minor", "currency", "mode")'));
});

check("A2ReceiptInsertAppliesTheSameOutcomeAssertion", () => {
  assert.match(hand, /CREATE CONSTRAINT TRIGGER "payment_receipts_outcome_check" AFTER INSERT ON "payment_receipts"\s+DEFERRABLE INITIALLY DEFERRED FOR EACH ROW/);
  const receiptCheck = fnText("payment_receipts_outcome_check");
  assert.match(receiptCheck, /PERFORM "payment_attempt_outcome_assert"\(NEW\.attempt_id\)/);
  assert.doesNotMatch(receiptCheck, /observed_|provider_reference/, "no observation freeze: reversal re-observation stays possible");
  assert.match(fnText("payment_attempts_outcome_check"), /PERFORM "payment_attempt_outcome_assert"\(NEW\.id\)/, "attempt check uses the same predicate");
  // Ledger: the only receipt insert is reached from applyAttemptOutcome, which runs only after the same attempt became succeeded / needs_review.
  assert.equal((ledger.match(/INSERT INTO payment_receipts/g) ?? []).length, 1);
  assert.equal((ledger.match(/this\.recordReceipt\(/g) ?? []).length, 1);
  assert.match(ledger, /const updated = await this\.applyAttemptTransition\(client, current, request\);\s+if \(updated\.status === "succeeded" \|\| updated\.status === "needs_review"\) \{\s+await this\.applyAttemptOutcome\(/);
  assert.equal((ledger.match(/this\.applyAttemptOutcome\(/g) ?? []).length, 1);
});

check("B1ObligationEventInsertGuardAndLegitimateWriters", () => {
  assert.match(hand, /CREATE TRIGGER "payment_obligation_events_insert_guard" BEFORE INSERT ON "payment_obligation_events"/);
  const fn = fnText("payment_obligation_events_insert_guard");
  assert.match(fn, /FROM "payment_obligations" o WHERE o\.id = NEW\.obligation_id FOR UPDATE/, "obligation locked first");
  assert.match(fn, /coalesce\(max\(e\.sequence\), 0\) \+ 1/);
  assert.match(fn, /NEW\.sequence IS DISTINCT FROM next_sequence/);
  assert.match(fn, /NEW\.to_status IS DISTINCT FROM current_status OR NEW\.from_status IS NOT DISTINCT FROM NEW\.to_status/);
  // The only writer computes the same sequence; its three callers match the guard's rules.
  assert.equal((ledger.match(/INSERT INTO payment_obligation_events/g) ?? []).length, 1);
  assert.match(ledger, /SELECT \$1, \$2, coalesce\(max\(sequence\), 0\) \+ 1, \$3, \$4, \$5/);
  assert.equal((ledger.match(/this\.appendObligationEvent\(/g) ?? []).length, 3);
  assert.match(ledger, /UPDATE payment_obligations SET sealed_at[^\n]*\n\s+await this\.appendObligationEvent\(client, o\.id, "created", null, "open"/, "created: NULL -> open after the seal (status stays open)");
  const move = ledger.slice(ledger.indexOf("private async moveObligation"), ledger.indexOf("private async openException"));
  assert.ok(move.indexOf("UPDATE payment_obligations") < move.indexOf("this.appendObligationEvent(client, o.id, eventType, o.status, to"), "status event after its UPDATE");
  assert.match(ledger, /this\.appendObligationEvent\(client, o\.id, "exception_opened", null, null,/);
  // Every ledger move changes status, so the from <> to rule never refuses one.
  for (const from of OBLIGATION_STATUSES) assert.ok(!canTransitionObligation(from, from), `${from} -> ${from} is not a transition`);
});

check("B2AttemptEventInsertGuardOn0018TableVia0019", () => {
  assert.match(hand, /CREATE TRIGGER "payment_attempt_events_insert_guard" BEFORE INSERT ON "payment_attempt_events"/);
  const fn = fnText("payment_attempt_events_insert_guard");
  assert.match(fn, /FROM "payment_attempts" a WHERE a\.id = NEW\.attempt_id FOR UPDATE/);
  assert.match(fn, /coalesce\(max\(e\.sequence\), 0\) \+ 1/);
  assert.match(fn, /NEW\.sequence IS DISTINCT FROM next_sequence/);
  assert.match(fn, /NEW\.to_status IS DISTINCT FROM current_status/);
  assert.doesNotMatch(fn, /from_status/, "from = to is a legitimate re-observation event");
  // 0018 is not modified: the live file and the review copy are identical and contain no 0019 guard.
  assert.equal(read("migration-review/0019/drizzle/0018_payment_attempts.sql"), migration0018);
  assert.doesNotMatch(migration0018, /payment_attempt_events_insert_guard/);
  // Writers: sequence 1 'created' -> created after the attempt INSERT; then max + 1 with to = the new status after the UPDATE.
  assert.equal((store.match(/INSERT INTO payment_attempt_events/g) ?? []).length, 2);
  assert.ok(store.indexOf("INSERT INTO payment_attempts") < store.indexOf("VALUES ($1, $2, 1, 'created', NULL, 'created'"));
  const apply = store.slice(store.indexOf("protected async applyAttemptTransition"), store.indexOf("async listEvents"));
  assert.ok(apply.indexOf("UPDATE payment_attempts SET") < apply.indexOf("INSERT INTO payment_attempt_events"), "event after its UPDATE");
  assert.match(apply, /coalesce\(max\(sequence\), 0\) \+ 1/);
  assert.match(apply, /\[randomUUID\(\), attemptId, request\.event\.type, current\.status, to,/, "to_status = the status just written");
});

check("C1ExpiryClockAndD1AccessLockOrder", () => {
  const attemptGuard = fnText("payment_attempts_obligation_guard");
  assert.match(attemptGuard, /clock_timestamp\(\) >= o\.expires_at/);
  assert.doesNotMatch(attemptGuard, /now\(\)/);
  assert.match(fnText("payment_obligations_guard"), /now\(\) < OLD\.expires_at/, "expiry guard unchanged");
  assert.match(ledger, /now\(\) >= expires_at AS due/, "ledger expiry unchanged");
  assert.match(attemptGuard, /ORDER BY a\.id\s+FOR SHARE OF a/, "trigger locks access rows in id order");
  assert.match(ledger, /ORDER BY a\.id\s+FOR SHARE OF a/, "same order as the ledger");
});

check("ReversalRemovesAll0019ObjectsAndKeeps0018", () => {
  const triggers = [...hand.matchAll(/CREATE (?:CONSTRAINT )?TRIGGER "(\w+)"[^;]*? ON "(\w+)"/g)].map((m) => ({ name: m[1], table: m[2] }));
  assert.equal(triggers.length, 12);
  const dropTables = reverseStatements.find((s) => s.startsWith("DROP TABLE")) ?? "";
  for (const { name, table } of triggers) {
    if (table === "payment_attempts" || table === "payment_attempt_events") {
      assert.ok(reverseCode.includes(`DROP TRIGGER "${name}" ON "public"."${table}"`), `drops ${name} from 0018 table ${table}`);
      assert.ok(reverseCode.includes(`'${name}'`), `post-check covers ${name}`);
    } else {
      assert.ok(dropTables.includes(`"public"."${table}"`), `${name} goes with ${table}`);
    }
  }
  for (const fn of [...hand.matchAll(/CREATE FUNCTION "(\w+)"/g)].map((m) => m[1])) assert.ok(reverseCode.includes(`'${fn}'`), `post-check covers ${fn}`);
  // Every named 0018 object is asserted present after reversal, and nothing the reversal drops belongs to 0018.
  const objects0018 = {
    constraints: constraintNames(migration0018),
    indexes: [...migration0018.matchAll(/CREATE (?:UNIQUE )?INDEX "(\w+)"/g)].map((m) => m[1]),
    triggers: [...migration0018.matchAll(/CREATE TRIGGER "(\w+)"/g)].map((m) => m[1]),
    functions: [...migration0018.matchAll(/CREATE FUNCTION "(\w+)"/g)].map((m) => m[1]),
  };
  assert.equal(objects0018.constraints.length, 16);
  for (const c of objects0018.constraints) assert.ok(reverseCode.includes(`'${c}'`), `post-check keeps 0018 constraint ${c}`);
  for (const i of objects0018.indexes) assert.ok(reverseCode.includes(`to_regclass('public.${i}') IS NULL`), `post-check keeps 0018 index ${i}`);
  for (const t of objects0018.triggers) assert.ok(reverseCode.includes(`ARRAY['${t}']`), `post-check keeps 0018 trigger ${t}`);
  assert.match(reverseCode, /to_regprocedure\('public\.payment_test_cleanup_allowed\(\)'\) IS NULL/);
  const protected0018 = new Set([...Object.values(objects0018).flat(), "payment_attempts", "payment_attempt_events"]);
  for (const s of reverseStatements.filter((x) => /^(DROP|ALTER)\b/.test(x))) {
    const dropped = s.startsWith("DROP TRIGGER") ? [/^DROP TRIGGER "(\w+)"/.exec(s)![1]]
      : s.startsWith("ALTER TABLE") ? [/DROP CONSTRAINT "(\w+)"/.exec(s)![1]]
      : [...s.matchAll(/"public"\."(\w+)"/g)].map((m) => m[1]);
    for (const name of dropped) assert.ok(!protected0018.has(name), `reversal never drops 0018 object ${name}`);
  }
});

console.log({ paymentMigration0019Static: "PASS", checks: checks.length, statements: statements.length });

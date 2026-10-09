/*
 * Assembles the reviewed 0019 migration (B3, review only):
 *   0019_precondition.sql + 0019_payment_obligations.generated.sql (one statement moved) + 0019_hand_written.sql
 *   -> drizzle/0019_payment_obligations.sql (inside migration-review/0019 only; ./drizzle is never touched).
 *
 * The one reordering: drizzle-kit emits ADD CONSTRAINT payment_attempts_obligation_binding_unique AFTER the
 * payment_receipts_attempt_fk that references it, which PostgreSQL rejects (no unique constraint matching the
 * referenced columns). It is moved before the first FOREIGN KEY statement.
 *
 *   node migration-review/0019/assemble.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const BREAK = "--> statement-breakpoint";
const read = (name) => readFileSync(join(here, name), "utf8").replace(/\r\n/g, "\n");

const generated = read("0019_payment_obligations.generated.sql")
  .split(BREAK)
  .map((s) => s.trim())
  .filter(Boolean);
const uniqueIndex = generated.findIndex((s) => s.includes('ADD CONSTRAINT "payment_attempts_obligation_binding_unique"'));
const firstFk = generated.findIndex((s) => s.includes("FOREIGN KEY"));
if (uniqueIndex < 0 || firstFk < 0) throw new Error("expected statements not found in the generated SQL");
if (uniqueIndex > firstFk) {
  const [statement] = generated.splice(uniqueIndex, 1);
  generated.splice(firstFk, 0, statement);
}

const header = [
  "-- 0019_payment_obligations: Payments Phase 2, step 3 (obligations, beneficiaries, receipts, exceptions, events).",
  "-- ASSEMBLED FOR REVIEW (B3) by migration-review/0019/assemble.mjs. NOT APPLIED. Apply only to filumire_test, only in B4, only with approval.",
  "-- Parts: 0019_precondition.sql | drizzle-kit output (binding UNIQUE moved before the FKs) | 0019_hand_written.sql",
  "",
].join("\n");

const out =
  header +
  read("0019_precondition.sql").trimEnd() +
  "\n" +
  generated.join(`${BREAK}\n`) +
  `${BREAK}\n` +
  read("0019_hand_written.sql").trimEnd() +
  "\n";

writeFileSync(join(here, "drizzle", "0019_payment_obligations.sql"), out, "utf8");
console.log({ statements: out.split(BREAK).length, movedBindingUnique: uniqueIndex > firstFk });

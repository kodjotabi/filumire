// Local artifact verification and read-only companion generation. Never runs SQL.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
const base = new URL("./", import.meta.url);
const migration = readFileSync(new URL("apply-registration-preview.sql", base), "utf8");
for (const name of ["0020_auth_rate_limits.sql", "0021_teacher_accounts.sql"]) {
  const original = readFileSync(new URL(`../drizzle/${name}`, base), "utf8");
  assert(migration.includes(original), `Original migration was not embedded: ${name}`);
}
assert(!migration.includes("idle_in_transaction_session_timeout"));
assert(migration.includes("AND c.contype <> 'n'"));
assert(migration.trimEnd().endsWith("COMMIT;"));
let verification = migration.match(/DO \$verification\$[\s\S]*?\$verification\$;/)?.[0];
assert(verification, "Complete transactional verification must exist");
const emptyTableCheck = /    IF EXISTS \(SELECT 1 FROM public\.auth_rate_limits\)\n       OR EXISTS \(SELECT 1 FROM public\.teacher_link_codes\) THEN\n        RAISE EXCEPTION 'New migration tables are unexpectedly populated';\n    END IF;\n/;
assert(emptyTableCheck.test(verification));
verification = verification.replace(emptyTableCheck, "");
const post = `-- Select neon-champagne-school / filumire-preview / neondb in Neon.
-- Run this entire read-only script after migration or before an uncertain retry.
-- No data is changed. Branch selection is the operator's responsibility.
-- The same definition checks used before COMMIT raise errors on mismatch.
-- Populated new tables are allowed here: later application use is legitimate.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';
SET LOCAL search_path = public, pg_catalog;
DO $database_check$
BEGIN
    IF current_database() <> 'neondb' THEN
        RAISE EXCEPTION 'Incorrect database: expected neondb';
    END IF;
END;
$database_check$;

${verification}

SELECT 'PASS: 0020 and 0021 schema definitions verified' AS result,
       current_database() AS database,
       current_setting('transaction_read_only') AS read_only;
ROLLBACK;
`;
writeFileSync(new URL("verify-registration-preview-after.sql", base), post, { flag: "wx" });
console.log(JSON.stringify({ originalMigrationDefinitionsMatch: true, postgres18ConstraintCountCorrected: true, idleTimeoutRemoved: true, postVerification: "scripts/verify-registration-preview-after.sql", sqlExecuted: false }));

// Builds a local, deliberately disabled SQL proposal. No database connection.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { SQL_SHA256 } from "./private-preview-guards.mjs";
try {
  if (process.argv.length !== 2) throw new Error("unexpected_arguments");
  const migrations = Object.entries(SQL_SHA256).map(([name, hash]) => {
    const sql = readFileSync(new URL(`../drizzle/${name}`, import.meta.url));
    if (createHash("sha256").update(sql).digest("hex") !== hash) throw new Error("migration_sql_changed");
    return { name, hash, sql: sql.toString("utf8") };
  });
  const sql = `-- BLOCKED PROPOSAL ONLY: do not execute without a fresh approved safety gate.
-- Target: neon-champagne-school / filumire-preview (br-round-resonance-b8fm2nao) / neondb.
-- Endpoint mapping, Production/main isolation and usable recovery remain unverified.
-- This artifact contains the exact committed 0020 and 0021 SQL, in that order.
-- The deliberate exception prevents schema changes if this proposal is run accidentally.
-- It must remain until isolation/recovery evidence is reviewed and execution is authorized.
BEGIN;
SET LOCAL search_path = public, pg_catalog;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';
DO $filumire_blocked$
BEGIN
  RAISE EXCEPTION 'BLOCKED: Preview isolation/recovery verification and migration authorization required';
END;
$filumire_blocked$;

${migrations.map(m => `-- BEGIN ${m.name}; SHA-256 ${m.hash}\n${m.sql}\n-- END ${m.name}`).join("\n\n")}

-- Authorized execution must verify exact resulting definitions and existing data
-- inside the same transaction before committing. This disabled proposal does
-- not implement that executor or establish endpoint-to-branch identity.
COMMIT;
`;
  const output = new URL("../docs/PRIVATE_PREVIEW_0020_0021_PROPOSAL.sql", import.meta.url);
  writeFileSync(output, sql, { flag: "wx" });
  console.log(JSON.stringify({ proposal: "docs/PRIVATE_PREVIEW_0020_0021_PROPOSAL.sql", branch: "br-round-resonance-b8fm2nao", migrations: migrations.map(({ name, hash }) => ({ name, sha256: hash })), executionEnabled: false, databaseConnections: 0, mutations: 0 }));
} catch {
  console.error(JSON.stringify({ failed: true, existingArtifactsPreserved: true }));
  process.exitCode = 1;
}

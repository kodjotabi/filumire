import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";
if (!process.argv[2]) throw new Error("Supply the designated test environment file.");
process.loadEnvFile(process.argv[2]);
let target;
try { target = new URL(process.env.DATABASE_URL ?? ""); }
catch { console.error("Invalid designated test connection configuration."); process.exit(1); }
if (!["localhost", "127.0.0.1"].includes(target.hostname) || target.pathname !== "/filumire_test" || decodeURIComponent(target.username) !== "filumire_test_user") {
  throw new Error("Refusing tests: designated localhost filumire_test/filumire_test_user required.");
}
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await client.connect();
  const who = (await client.query("SELECT current_database() AS db, current_user AS role, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser")).rows[0];
  if (who.db !== "filumire_test" || who.role !== "filumire_test_user" || who.superuser) throw new Error("Unexpected test database identity.");
} finally { await client.end(); }
const root = fileURLToPath(new URL("../", import.meta.url));
const suites = ["account-registration-journey", "teacher-linking", "auth-rate-limit", "principal-auth-session", "learner-progress", "api-auth-postgres-lifecycle"];
// learning-language uses the development identity header, which is memory-only
// (services/identity developmentIdentityEnabled); it runs in the offline catalogue.
const selected = process.argv[3] ? suites.filter(suite => suite === process.argv[3]) : suites;
if (!selected.length) throw new Error("Unknown test suite.");
for (const suite of selected) {
  console.log(`\nPostgreSQL private-preview test: ${suite}`);
  const result = spawnSync(process.execPath, ["--import", "tsx", `tests/${suite}.test.ts`], {
    cwd: root, stdio: "inherit", env: { ...process.env, FILUMIRE_PERSISTENCE: "postgres", FILUMIRE_AUTH_JWT_SECRET: "private-preview-test-only-secret-32-characters" },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`PASS: ${selected.length} PostgreSQL suites on localhost/filumire_test only.`);

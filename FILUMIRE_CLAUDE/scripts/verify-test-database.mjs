/*
 * Read-only safety check before any Postgres migration or test run.
 * Connects with DATABASE_URL and refuses (exit 1) unless the database is
 * exactly "filumire_test" and the user is not a superuser. Never prints
 * the password. Changes nothing.
 *
 * Run: node --env-file=.env.postgres-test.local scripts/verify-test-database.mjs [--for-migration]
 * --for-migration also requires CREATE rights in the database and schema public.
 */
import pg from "pg";

const EXPECTED_DATABASE = "filumire_test";
const url = process.env.DATABASE_URL;

if (!url) {
  console.error("REFUSED: DATABASE_URL is not set.");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error("REFUSED: DATABASE_URL is not a valid URL.");
  process.exit(1);
}

const configured = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
if (configured !== EXPECTED_DATABASE) {
  console.error(`REFUSED: DATABASE_URL names database "${configured}", not "${EXPECTED_DATABASE}".`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  const who = (await client.query(
    "SELECT current_database() AS db, current_user AS usr, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser, current_setting('server_version') AS version",
  )).rows[0];
  const rights = (await client.query(
    "SELECT has_database_privilege(current_database(), 'CREATE') AS db_create, has_schema_privilege('public', 'CREATE') AS schema_create",
  )).rows[0];
  const tables = (await client.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'",
  )).rows[0].n;

  console.log(JSON.stringify({ database: who.db, user: who.usr, superuser: who.superuser, postgres: who.version, publicTables: tables, canCreateInDatabase: rights.db_create, canCreateInPublic: rights.schema_create, host: parsed.host }));

  if (who.db !== EXPECTED_DATABASE) {
    console.error(`REFUSED: connected to "${who.db}", not "${EXPECTED_DATABASE}".`);
    process.exit(1);
  }
  if (who.superuser) {
    console.error("REFUSED: connected as a superuser; use the dedicated filumire_test_user.");
    process.exit(1);
  }
  if (process.argv.includes("--for-migration") && !(rights.db_create && rights.schema_create)) {
    console.error("REFUSED for migration: " + who.usr + " cannot create objects in " + EXPECTED_DATABASE + " (needs database ownership / CREATE on schema public).");
    process.exit(1);
  }
  console.log(`OK: connected to ${EXPECTED_DATABASE} as ${who.usr} (not superuser).`);
} catch (error) {
  console.error(`REFUSED: could not connect (${error.code ?? ""} ${error.message}).`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}

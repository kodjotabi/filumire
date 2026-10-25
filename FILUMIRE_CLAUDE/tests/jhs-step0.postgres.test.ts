// Invoked only by scripts/test-jhs-step0-postgres.mjs on its fresh local cluster.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import * as schema from "../services/database-schema";

const target = new URL(process.env.DATABASE_URL ?? "");
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.port, process.env.FILUMIRE_JHS_PG_EXPECTED_PORT);
assert.equal(target.pathname, "/filumire_test");
assert.equal(target.username, "filumire_test_user");
assert.match(process.env.FILUMIRE_JHS_PG_TEST_RUN ?? "", /^jhs-step0-pg-[\w-]+$/);
assert.equal(process.env.FILUMIRE_PERSISTENCE, "postgres");
const client = new pg.Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 });
await client.connect();
let appPool: pg.Pool | undefined;
try {
  const identity = (await client.query(`SELECT current_database() AS db, current_user AS role,
    host(inet_server_addr()) AS host, inet_server_port() AS port,
    (SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS superuser`)).rows[0];
  assert.equal(identity.db, "filumire_test");
  assert.equal(identity.role, "filumire_test_user");
  assert.equal(identity.host, "127.0.0.1");
  assert.equal(identity.port, Number(target.port));
  assert.equal(identity.superuser, false);
  // Verify the cluster identifier via its freshly created control file, not an existing server.
  const { readFileSync } = await import("node:fs");
  const control = readFileSync(resolve(".vercel", process.env.FILUMIRE_JHS_PG_TEST_RUN!, "data", "global", "pg_control"));
  assert.equal(control.readBigUInt64LE(0).toString(), process.env.FILUMIRE_JHS_PG_SYSTEM_ID);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0,
    "refuse an existing populated test database");
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
  writeFileSync(resolve(".vercel", process.env.FILUMIRE_JHS_PG_TEST_RUN!, "schema.sql"), statements.join(";\n"));
  await client.query("BEGIN");
  for (const statement of statements) await client.query(statement);
  await client.query("COMMIT");
  // Match the deployed role's append-only learner/history privileges. The
  // schema owner stays on this separate connection for fault injection only.
  await client.query("GRANT USAGE ON SCHEMA public TO filumire_app");
  await client.query(`GRANT SELECT, INSERT ON account_profiles, controlled_teacher_actions, external_identities,
    guardian_consent_records, learners, learning_evidence, parent_teacher_messages,
    pilot_measurement_events, teacher_professional_notes TO filumire_app`);
  await client.query(`GRANT SELECT, INSERT, UPDATE ON account_credentials, auth_sessions, interventions,
    learner_learning_context, learner_profiles, learner_states, pending_teacher_reviews,
    principal_learner_access, sessions, teacher_link_codes TO filumire_app`);
  await client.query("GRANT SELECT, INSERT, UPDATE, DELETE ON auth_rate_limits TO filumire_app");
  await client.query("GRANT SELECT, INSERT, DELETE ON principals TO filumire_app");
  assert.equal((await client.query("SELECT count(*)::int AS n FROM learners")).rows[0].n, 0);
  process.env.FILUMIRE_JHS_PG_TEST_VERIFIED = "true";
  const applicationTarget = new URL(target);
  applicationTarget.username = "filumire_app";
  process.env.DATABASE_URL = applicationTarget.toString();
  const { pool } = await import("../services/database");
  appPool = pool;
  assert.equal((await pool.query("SELECT current_user AS role")).rows[0].role, "filumire_app");
  assert.equal((await pool.query("SELECT has_table_privilege(current_user,'public.learners','UPDATE') AS allowed")).rows[0].allowed, false);
  await import("./jhs-step0-history.test");
  const { PRIVATE_JHS_SCOPE } = await import("../packages/curriculum/jhs-private-policy");
  const { getCompetency } = await import("../packages/curriculum");
  const { getFrameworkCompetencyRegistration } = await import("../packages/curriculum-framework");
  const { seedContent } = await import("../services/content-store/seed");
  const { runJhsJourneys } = await import("./fixtures/jhs-journey-runner");
  const definitions = PRIVATE_JHS_SCOPE.map(row => getCompetency(row.competencyId)!);
  const selected = [definitions.find(c => c.assessmentScope === 'understanding_only')!,
    definitions.find(c => c.assessmentScope !== 'understanding_only' && c.prerequisiteCompetencyIds.length > 0)!];
  process.env.FILUMIRE_JHS_JOURNEY_OUTPUT_DIR = ".vercel/jhs-step0/postgres-journeys";
  await runJhsJourneys({ competencies: selected, sources: selected.map(c => getFrameworkCompetencyRegistration(c.id)!),
    install: seedContent, output: "postgres/journeys.json",
    afterSignIn: async sessionId => {
      assert.equal(process.env.FILUMIRE_JHS_PG_TEST_VERIFIED, "true");
      // PostgreSQL DEFAULT now() is outside node:test's mocked Date. Align only
      // this freshly issued fictional session with the simulated sign-in date,
      // so normal idle/maximum-lifetime renewal still applies unchanged.
      assert.match(sessionId, /^session-(?:revision-|second-revision-)?learner-jhs-materials-batch-/);
      await pool.query("UPDATE auth_sessions SET created_at=$2, last_activity_at=$2, updated_at=$2 WHERE id=$1", [sessionId, new Date().toISOString()]);
    } });
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM learners WHERE id NOT LIKE 'fictional-%' AND id NOT LIKE 'learner-jhs-materials-batch-%'")).rows[0].n, 0);
  console.log("PASS isolated PostgreSQL: historical records, EN/FR independent mastery, delayed successful and failed retention, full and understanding-only topics; fictional learners only");
} finally {
  await client.query("ROLLBACK").catch(() => {});
  await client.end();
  await appPool?.end();
}

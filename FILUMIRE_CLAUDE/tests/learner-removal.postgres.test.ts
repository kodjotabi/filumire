// Invoked only by scripts/test-learner-removal-postgres.mjs on its fresh local cluster.
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import * as schema from "../services/database-schema";

const target = new URL(process.env.DATABASE_URL ?? "");
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.port, process.env.FILUMIRE_REMOVAL_PG_EXPECTED_PORT);
assert.equal(target.pathname, "/filumire_test");
assert.equal(target.username, "filumire_test_user");
assert.match(process.env.FILUMIRE_REMOVAL_PG_TEST_RUN ?? "", /^learner-removal-pg-[\w-]+$/);
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
  const control = readFileSync(resolve(".vercel", process.env.FILUMIRE_REMOVAL_PG_TEST_RUN!, "data", "global", "pg_control"));
  assert.equal(control.readBigUInt64LE(0).toString(), process.env.FILUMIRE_REMOVAL_PG_SYSTEM_ID);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public'")).rows[0].n, 0,
    "refuse an existing populated test database");
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
  writeFileSync(resolve(".vercel", process.env.FILUMIRE_REMOVAL_PG_TEST_RUN!, "schema.sql"), statements.join(";\n"));
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
  process.env.FILUMIRE_REMOVAL_PG_TEST_VERIFIED = "true";
  const applicationTarget = new URL(target);
  applicationTarget.username = "filumire_app";
  process.env.DATABASE_URL = applicationTarget.toString();
  const { pool } = await import("../services/database");
  appPool = pool;
  assert.equal((await pool.query("SELECT current_user AS role")).rows[0].role, "filumire_app");
  assert.equal((await pool.query("SELECT has_table_privilege(current_user,'public.learners','UPDATE') AS allowed")).rows[0].allowed, false);
  const { removalFixtures: f } = await import("./learner-removal.test");
  const { accountStore } = await import("../services/account/store");
  const { createTeacherLinkCodeFor, linkTeacherWithCode } = await import("../services/account");
  const { isPrincipalAuthorizedForLearner } = await import("../services/principal");

  const removed = (await client.query("SELECT status FROM learners WHERE id=$1", [f.child.learnerId])).rows[0];
  assert.equal(removed.status, "active", "learner history row remains unchanged; access/credentials record removal");
  assert.equal((await client.query("SELECT status FROM account_credentials WHERE principal_id=$1", [f.childPrincipal])).rows[0].status, "disabled");
  assert.equal((await client.query("SELECT count(*)::int AS n FROM auth_sessions WHERE principal_id=$1 AND status='active'", [f.childPrincipal])).rows[0].n, 0);

  // Force a failure after access/code/learner updates; the transaction must undo all of them.
  const rollbackChild = await f.add("fictional.rollback");
  const rollbackCode = await createTeacherLinkCodeFor(f.owner, rollbackChild.learnerId);
  await client.query(`CREATE FUNCTION fictional_removal_fail() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN IF NEW.status = 'disabled' THEN RAISE EXCEPTION 'fictional rollback test'; END IF; RETURN NEW; END $$`);
  await client.query("CREATE TRIGGER fictional_removal_fail BEFORE UPDATE ON account_credentials FOR EACH ROW EXECUTE FUNCTION fictional_removal_fail()");
  try {
    await assert.rejects(accountStore.removeLearnerAccount(f.owner, rollbackChild.learnerId));
    assert.equal(await isPrincipalAuthorizedForLearner(f.owner, rollbackChild.learnerId), true);
    assert.equal((await client.query("SELECT status FROM learners WHERE id=$1", [rollbackChild.learnerId])).rows[0].status, "active");
    assert.equal((await client.query("SELECT revoked_at FROM teacher_link_codes WHERE learner_id=$1", [rollbackChild.learnerId])).rows[0].revoked_at, null);
  } finally {
    await client.query("DROP TRIGGER fictional_removal_fail ON account_credentials");
    await client.query("DROP FUNCTION fictional_removal_fail()");
  }
  await linkTeacherWithCode(f.teacher, rollbackCode.code);
  assert.equal(await accountStore.removeLearnerAccount(f.owner, rollbackChild.learnerId), true);
  assert.equal(await isPrincipalAuthorizedForLearner(f.teacher, rollbackChild.learnerId), false);
  console.log("PASS PostgreSQL: retained learner row, disabled credentials, revoked sessions, atomic rollback and retry");

  // Exercise actual PostgreSQL row locks, with removal and redemption queued in both orders.
  for (const order of ["remove-first", "redeem-first"]) {
    const child = await f.add(`fictional.${order}`);
    const code = await createTeacherLinkCodeFor(f.owner, child.learnerId);
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`filumire-learner-access:${child.learnerId}`]);
    const remove = () => accountStore.removeLearnerAccount(f.owner, child.learnerId);
    const redeem = () => linkTeacherWithCode(f.teacher, code.code);
    const first = (order === "remove-first" ? remove() : redeem());
    const settledFirst = Promise.allSettled([first]);
    // Wait until the first operation really blocks on our row lock.
    let blocked = false;
    for (let i = 0; i < 100; i++) {
      const result = await client.query("SELECT count(*)::int AS n FROM pg_locks WHERE locktype='advisory' AND NOT granted AND database=(SELECT oid FROM pg_database WHERE datname=current_database())");
      if (result.rows[0].n > 0) { blocked = true; break; }
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert(blocked, "first operation is waiting on PostgreSQL row lock");
    const second = (order === "remove-first" ? redeem() : remove());
    const settledSecond = Promise.allSettled([second]);
    await client.query("COMMIT");
    const [a, b] = await Promise.all([settledFirst, settledSecond]);
    const removal = order === "remove-first" ? a[0] : b[0];
    assert.equal(removal.status, "fulfilled");
    assert.equal((removal as PromiseFulfilledResult<boolean>).value, true);
    assert.equal(await isPrincipalAuthorizedForLearner(f.teacher, child.learnerId), false);
    assert.equal(await isPrincipalAuthorizedForLearner(f.owner, child.learnerId), false);
    console.log(`PASS PostgreSQL transaction-lock race: ${order}`);
  }
  console.log("PASS isolated PostgreSQL learner-removal integration");
} finally {
  await client.query("ROLLBACK").catch(() => {});
  await client.end();
  await appPool?.end();
}

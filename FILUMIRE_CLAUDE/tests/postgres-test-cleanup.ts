/*
 * Shared clean-up for Postgres tests (8 October 2026).
 *
 * Several Postgres tests deleted their own test learner with a bare
 * "DELETE FROM learners", which fails since later migrations added more
 * tables referencing learners (learner_learning_context, pilot measures,
 * teacher notes, ...). The foreign key then blocks the delete and the open
 * pool keeps the test process alive.
 *
 * This removes ONLY the given test learners' rows, child tables first, and
 * refuses to run in a database whose name does not contain "test", so test
 * clean-up can never delete in an application database.
 */

type Queryable = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
};

/* Every table with a learner_id foreign key to learners (drizzle migrations 0000-0015, 0019). */
const LEARNER_CHILD_TABLES = [
  "controlled_teacher_actions",
  "guardian_consent_records",
  "interventions",
  "learner_profiles",
  "learner_learning_context",
  "learner_states",
  "learning_evidence",
  "parent_teacher_messages",
  "pending_teacher_reviews",
  "pilot_measurement_events",
  "principal_learner_access",
  "sessions",
  "teacher_professional_notes",
] as const;

export async function deleteTestLearners(pool: Queryable, learnerIds: string[]): Promise<void> {
  if (learnerIds.length === 0) return;

  const database = String((await pool.query("SELECT current_database() AS db")).rows[0].db);
  if (!/test/i.test(database)) {
    throw new Error(`Refusing test clean-up in database "${database}" (name must contain "test").`);
  }

  for (const table of LEARNER_CHILD_TABLES) {
    await pool.query(`DELETE FROM ${table} WHERE learner_id = ANY($1::text[])`, [learnerIds]);
  }
  await pool.query("DELETE FROM learners WHERE id = ANY($1::text[])", [learnerIds]);
}

/* Built-in account rows that reference principals (migration 0019). */
export async function deleteTestPrincipals(pool: Queryable, principalIds: string[]): Promise<void> {
  if (principalIds.length === 0) return;

  const database = String((await pool.query("SELECT current_database() AS db")).rows[0].db);
  if (!/test/i.test(database)) {
    throw new Error(`Refusing test clean-up in database "${database}" (name must contain "test").`);
  }

  for (const [table, column] of [
    ["guardian_consent_records", "guardian_principal_id"],
    ["account_credentials", "principal_id"],
    ["account_profiles", "principal_id"],
    ["auth_sessions", "principal_id"],
    ["principal_learner_access", "principal_id"],
  ] as const) {
    await pool.query(`DELETE FROM ${table} WHERE ${column} = ANY($1::text[])`, [principalIds]);
  }
  await pool.query("DELETE FROM principals WHERE id = ANY($1::text[])", [principalIds]);
}

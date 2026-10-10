// Read-only: checks the target schema and configuration; never runs DDL.
import pg from "pg";
const checks = [];
const check = (name, ready) => checks.push({ name, ready: Boolean(ready) });
check("postgres persistence", process.env.FILUMIRE_PERSISTENCE === "postgres");
check("authentication secret (32+ characters)", (process.env.FILUMIRE_AUTH_JWT_SECRET ?? "").length >= 32);
check("DATABASE_URL configured", Boolean(process.env.DATABASE_URL));
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  await client.connect();
  await client.query("BEGIN READ ONLY");
  const columns = (await client.query(`SELECT table_name, column_name, data_type
    FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name IN ('auth_rate_limits', 'teacher_link_codes', 'account_credentials', 'account_profiles', 'learner_profiles')`)).rows;
  const has = (table, column, type) => columns.some((row) => row.table_name === table && row.column_name === column && (!type || row.data_type === type));
  check("0019 account tables", has("account_credentials", "account_kind") && has("account_profiles", "preferred_language") && has("learner_profiles", "sign_in_principal_id"));
  check("0020 rate-limit columns", has("auth_rate_limits", "key_hash", "text") && has("auth_rate_limits", "request_count", "integer") && has("auth_rate_limits", "window_ends_at", "timestamp with time zone"));
  check("0021 teacher-code columns", ["id", "code_hash", "learner_id", "created_by_principal_id", "expires_at", "used_at", "used_by_principal_id", "revoked_at", "created_at"].every((column) => has("teacher_link_codes", column)));
  const constraints = (await client.query(`SELECT c.conname, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname IN ('account_credentials', 'teacher_link_codes', 'auth_rate_limits')`)).rows;
  check("0021 teacher account kind allowed", constraints.some((row) => row.conname === "account_credentials_account_kind_check" && ["guardian", "learner", "teacher"].every((kind) => row.definition.includes(`'${kind}'`))));
  check("0021 unique code hash", constraints.some((row) => row.conname === "teacher_link_codes_code_hash_unique"));
  for (const name of ["teacher_link_codes_learner_id_learners_id_fk", "teacher_link_codes_created_by_principal_id_principals_id_fk", "teacher_link_codes_used_by_principal_id_principals_id_fk"]) {
    check(name, constraints.some((row) => row.conname === name));
  }
  check("0020 rate-limit primary key", constraints.some((row) => row.conname === "auth_rate_limits_pkey" && row.definition === "PRIMARY KEY (key_hash)"));
  const indexes = (await client.query(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('auth_rate_limits', 'teacher_link_codes')`)).rows;
  check("0020 expiry index", indexes.some((row) => row.indexname === "auth_rate_limits_window_ends_at_idx"));
  check("0021 learner index", indexes.some((row) => row.indexname === "teacher_link_codes_learner_idx"));
  await client.query("ROLLBACK");
} catch (error) {
  // Driver messages may contain hostnames or connection strings. Print only a code.
  check(`database inspection (${error.code ?? "unavailable"})`, false);
} finally {
  await client.end().catch(() => {});
}
console.log(JSON.stringify({ ready: checks.every((entry) => entry.ready), registration: process.env.FILUMIRE_ACCOUNT_REGISTRATION === "open" ? "open" : "closed", checks }, null, 2));
if (checks.some((entry) => !entry.ready)) process.exitCode = 1;

// Offline fixture only. Unknown queries fail rather than silently claiming success.
import { loadManifest } from "../../scripts/migration-ledger.mjs";
import { pinnedTarget, IDENTITY_SQL } from "../../scripts/pinned-targets.mjs";
import { APP_ROLE_MATRIX } from "../../scripts/test-app-role-permissions.mjs";
import { PUBLIC_ACCESS_SQL } from "../../scripts/w4-safety.mjs";
import { EVIDENCE_SQL, EVIDENCE_DEFINITION } from "../../scripts/apply-app-role-grants.mjs";

export const manifest = loadManifest();
export const profile = pinnedTarget("filumire-preview");
export const LEDGER = manifest.entries.map(e => ({ id: e.id, kind: e.kind, sha256: e.sha256 ?? "b".repeat(64) }));
export const TABLES = Object.keys(APP_ROLE_MATRIX).sort();

export function fakeClient(overrides = {}) {
  const s = { queries: [], sql: [], roleCreated: null, policySent: false, ledger: LEDGER, tables: TABLES, roleExists: false, others: null,
    publicTableGrants: 0, publicViewGrants: 0, publicColumnGrants: 0, publicSequenceGrants: 0,
    createrole: true, identity: { db: "neondb", usr: "neondb_owner", su: false, tl: profile.timelineId },
    role: { rolsuper: false, rolcreaterole: false, rolcreatedb: false, rolreplication: false, rolbypassrls: false, rolcanlogin: true,
      rolinherit: false, rolconnlimit: 20, rolvaliduntil: null }, memberships: 0, failCreate: null, failCommit: false, failRollback: false,
    commitResult: "COMMIT", viewTrusted: true, viewDefinition: EVIDENCE_DEFINITION, ...overrides };
  s.query = async (sql, params) => {
    s.sql.push(sql); s.queries.push(sql.trim().split(/\s+/).slice(0, 2).join(" "));
    if (sql === "COMMIT") {
      if (s.failCommit) { s.serverCommitted = s.failCommit === "after"; throw new Error("connection terminated"); }
      return { command: s.commitResult, rows: [] };
    }
    if (sql === "ROLLBACK") { if (s.failRollback) throw new Error("connection lost"); return { command: "ROLLBACK", rows: [] }; }
    if (sql === IDENTITY_SQL) return { rows: [s.identity] };
    if (sql === PUBLIC_ACCESS_SQL) return { rows: [{ n: s.publicTableGrants + s.publicViewGrants + s.publicColumnGrants + s.publicSequenceGrants }] };
    if (sql === EVIDENCE_SQL) return { rows: s.viewMissing ? [] : [{ trusted: s.viewTrusted, definition: s.viewDefinition }] };
    if (sql.startsWith("select rolcreaterole r")) return { rows: [{ r: s.createrole }] };
    if (sql.startsWith("select to_regclass")) return { rows: [{ t: "filumire_schema_migrations" }] };
    if (sql.startsWith("select id, kind, sha256")) return { rows: s.ledger };
    if (sql.startsWith("select tablename t")) return { rows: s.tables.map(t => ({ t })) };
    if (sql.startsWith("select count(*)::int n from pg_roles")) return { rows: [{ n: s.roleExists ? 1 : 0 }] };
    if (sql.startsWith("select string_agg(rolname")) return { rows: [{ r: s.others }] };
    if (sql.startsWith("CREATE ROLE")) { if (s.failCreate) throw new Error(s.failCreate); s.roleCreated = sql; return { rows: [] }; }
    if (sql.startsWith("select rolsuper")) return { rows: [s.role] };
    if (sql.startsWith("select count(*)::int n from pg_auth_members")) return { rows: [{ n: s.memberships }] };
    if (sql.startsWith("-- Least-privilege grants")) { s.policySent = true; if (s.failPolicy) throw new Error("policy failed"); return { rows: [] }; }
    if (/^(SET |BEGIN$)/.test(sql)) return { rows: [] };
    if (/^select table_name t|^select table_name, column_name|^select conrelid::regclass|^select tablename, indexname/.test(sql)) return { rows: [] };
    throw new Error("unexpected fake query");
  };
  return s;
}

// Read-only catalog snapshot of the public schema: tables, columns, constraints, indexes, and a SHA-256 of them.
// Used as the ledger baseline hash and for drift checks. Prints no credentials.
// Usage: node scripts/catalog-snapshot.mjs --url-env <ENV_VAR_NAME> [--out <file.json>]
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function catalog(client) {
  const q = async sql => (await client.query(sql)).rows;
  const tables = (await q("select table_name t from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1")).map(r => r.t);
  const columns = await q("select table_name, column_name, data_type, udt_name, is_nullable, column_default from information_schema.columns where table_schema='public' order by 1,2");
  const constraints = await q("select conrelid::regclass::text tbl, conname, contype, pg_get_constraintdef(oid) def from pg_constraint where connamespace='public'::regnamespace order by 1,2");
  const indexes = await q("select tablename, indexname, indexdef from pg_indexes where schemaname='public' order by 1,2");
  return { tables, columns, constraints, indexes };
}
export const catalogHash = snapshot => createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

/** Connects with the URL in an environment variable, in a read-only session. */
export async function readOnlyClient(urlEnv) {
  const url = urlEnv && process.env[urlEnv];
  if (!url) throw new Error("missing_url_env");
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10000 });
  await client.connect();
  await client.query("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY");
  return client;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const urlEnv = args[args.indexOf("--url-env") + 1], out = args.includes("--out") ? args[args.indexOf("--out") + 1] : undefined;
  try {
    const client = await readOnlyClient(args.includes("--url-env") ? urlEnv : undefined);
    try {
      const [who] = (await client.query("select current_database() db, current_user usr, version() v")).rows;
      const snapshot = await catalog(client);
      if (out) writeFileSync(out, JSON.stringify(snapshot, null, 1));
      console.log(JSON.stringify({ database: who.db, role: who.usr, server: who.v.split(" ").slice(0, 2).join(" "), tables: snapshot.tables.length,
        columns: snapshot.columns.length, constraints: snapshot.constraints.length, indexes: snapshot.indexes.length, sha256: catalogHash(snapshot) }, null, 1));
    } finally { await client.end(); }
  } catch (error) {
    console.log(JSON.stringify({ error: error?.message === "missing_url_env" ? "missing_url_env" : "database_error" }));
    process.exitCode = 1;
  }
}

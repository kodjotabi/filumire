// Receive connection settings over stdin, never argv/logs. Read-only only.
import pg from "pg";
let input = "";
if (!process.stdin.isTTY) throw new Error("A terminal with echo disabled is required.");
process.stdin.setRawMode(true);
console.log("Ready for private connection input (echo disabled).");
await new Promise((resolve) => {
  process.stdin.on("data", function receive(chunk) {
    input += chunk;
    if (/[\r\n]/.test(input)) {
      process.stdin.removeListener("data", receive);
      process.stdin.pause();
      resolve();
    }
  });
});
let settings, url;
try { settings = JSON.parse(input); url = new URL(settings.databaseUrl); }
catch { console.error("Invalid private connection input."); process.exit(1); }
const client = new pg.Client({ connectionString: settings.databaseUrl, connectionTimeoutMillis: 10000 });
try {
  await client.connect();
  await client.query("BEGIN READ ONLY");
  const identity = (await client.query("SELECT current_database() AS database, current_user AS role, (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) AS superuser")).rows[0];
  const tables = (await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")).rows.map(row => row.table_name);
  const constraints = (await client.query("SELECT conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname = 'account_credentials_account_kind_check'")).rows;
  const counts = {};
  for (const table of ["learners", "principals", "account_credentials", "learning_evidence"]) {
    if (tables.includes(table)) counts[table] = Number((await client.query(`SELECT count(*) AS count FROM ${table}`)).rows[0].count);
  }
  await client.query("ROLLBACK");
  console.log(JSON.stringify({ connected: true, endpoint: url.hostname, neonProject: settings.neonProject, ...identity, tables, constraints, counts }, null, 2));
} catch (error) {
  console.log(JSON.stringify({ connected: false, code: error.code ?? "connection_failed" }));
  process.exitCode = 1;
} finally { await client.end().catch(() => {}); }

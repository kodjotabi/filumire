// Creates a brand-new local PostgreSQL cluster. Never uses DATABASE_URL or .env.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, existsSync, writeFileSync, openSync, closeSync, readFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pgBin = process.env.FILUMIRE_TEST_PG_BIN ?? "C:/Program Files/PostgreSQL/17/bin";
assert(existsSync(join(pgBin, "initdb.exe")), "Set FILUMIRE_TEST_PG_BIN to installed PostgreSQL binaries");
mkdirSync(join(root, ".vercel"), { recursive: true });
const folder = mkdtempSync(join(root, ".vercel", "learner-removal-pg-"));
const data = join(folder, "data");
const log = join(folder, "postgres.log");
const server = createServer();
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
const port = server.address().port;
await new Promise(resolve => server.close(resolve));
// Ignore inherited PostgreSQL configuration, including any service/connection vars.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^PG/i.test(key) && key !== "DATABASE_URL" && key !== "NODE_OPTIONS"));
function command(exe, args) {
  // Windows postgres inherits pg_ctl handles; files prevent a surviving server
  // from holding the parent's captured output pipes open after pg_ctl exits.
  const output = join(folder, `${exe}-${args.at(-1)}.log`);
  const fd = openSync(output, "w");
  let result;
  try {
    result = spawnSync(join(pgBin, exe), args, { env, stdio: ["ignore", fd, fd], windowsHide: true, timeout: 60000 });
  } finally { closeSync(fd); }
  if (result.error || result.status !== 0) throw new Error(`${exe} failed: ${result.error?.message ?? readFileSync(output, "utf8")}`);
}
let started = false;
try {
  command("initdb.exe", ["-D", data, "-U", "filumire_isolated_admin", "--auth=trust", "--encoding=UTF8", "--locale=C"]);
  console.log("Fresh PostgreSQL cluster initialized.");
  started = true;
  command("pg_ctl.exe", ["-D", data, "-l", log, "-o", `-h 127.0.0.1 -p ${port}`, "-w", "start"]);
  console.log(`Isolated PostgreSQL listening on 127.0.0.1:${port}.`);
  const admin = new pg.Client({ host: "127.0.0.1", port, database: "postgres", user: "filumire_isolated_admin", connectionTimeoutMillis: 5000 });
  await admin.connect();
  let systemIdentifier;
  try {
    systemIdentifier = (await admin.query("SELECT system_identifier::text AS id FROM pg_control_system()")).rows[0].id;
    await admin.query("CREATE ROLE filumire_test_user LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE");
    await admin.query("CREATE ROLE filumire_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE");
    await admin.query("CREATE DATABASE filumire_test OWNER filumire_test_user");
  } finally { await admin.end(); }
  const testEnv = { ...env, DATABASE_URL: `postgresql://filumire_test_user@127.0.0.1:${port}/filumire_test`,
    FILUMIRE_PERSISTENCE: "postgres", FILUMIRE_REMOVAL_PG_TEST_RUN: folder.split(/[\\/]/).at(-1),
    FILUMIRE_REMOVAL_PG_SYSTEM_ID: systemIdentifier, FILUMIRE_REMOVAL_PG_EXPECTED_PORT: String(port),
    FILUMIRE_AUTH_JWT_SECRET: "fictional-removal-postgres-only-test-secret-32-characters",
    FILUMIRE_REMOVAL_TEST_REVIEWERS: process.argv.includes("--reviewers") ? "true" : "false",
    FILUMIRE_ACCOUNT_REGISTRATION: "open" };
  const result = spawnSync(process.execPath, ["--import", "tsx", "tests/learner-removal.postgres.test.ts"],
    { cwd: root, env: testEnv, encoding: "utf8", windowsHide: true, timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
  writeFileSync(join(folder, "tests.log"), `${result.stdout ?? ""}${result.stderr ?? ""}`);
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  assert.equal(result.status, 0, result.error?.message ?? "PostgreSQL removal test failed; see tests.log");
  writeFileSync(join(folder, "result.json"), JSON.stringify({ result: "PASS", postgresql: "17", host: "127.0.0.1", port,
    database: "filumire_test", schemaOwner: "filumire_test_user", applicationRole: "filumire_app", systemIdentifier, fictionalFixturesOnly: true,
    externalDatabaseAccess: false, schema: "generated from current services/database-schema.ts" }, null, 2));
  console.log(`Evidence: ${folder}`);
} finally {
  if (started && existsSync(join(data, "postmaster.pid"))) command("pg_ctl.exe", ["-D", data, "-m", "fast", "-w", "stop"]);
  console.log("Isolated PostgreSQL cluster stopped; files retained locally.");
}

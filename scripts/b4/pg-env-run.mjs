/*
 * Payments Phase 2, step 3, B4 (artifact A2): credential-safe runner for psql / pg_dump against filumire_test.
 *
 * Reads DATABASE_URL from .env.postgres-test.local only (never from the shell, never from .env), refuses unless the
 * URL names database filumire_test on localhost:5432, and passes the connection to the tool through PG* environment
 * variables of the child process only: the password never appears in argv or in any output of this script.
 * Refuses any argument that would redirect the connection (-d/-h/-p/-U, a connection URI, a service).
 * psql always runs with -X -v ON_ERROR_STOP=1 --no-password.
 *
 * Run (cwd FILUMIRE_CLAUDE): node scripts/b4/pg-env-run.mjs psql -f <file.sql> [-v name=value ...]
 *                            node scripts/b4/pg-env-run.mjs pg_dump --schema-only -f <out.sql>
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const EXPECTED_DATABASE = "filumire_test";
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const EXPECTED_PORT = "5432";
const PG_BIN = "C:\\Program Files\\PostgreSQL\\17\\bin";
const TOOLS = new Set(["psql", "pg_dump"]);
const ENV_FILE = ".env.postgres-test.local";

function refuse(message) {
  console.error(`REFUSED: ${message}`);
  process.exit(2);
}

const [tool, ...args] = process.argv.slice(2);
if (!TOOLS.has(tool)) refuse(`tool must be one of ${[...TOOLS].join(", ")}.`);

// P2: drizzle-kit and other tools load .env on their own; none may exist, and the shell must carry no connection.
if (existsSync(".env")) refuse(".env exists in the working directory.");
for (const name of Object.keys(process.env)) {
  if (name === "DATABASE_URL" || name === "DOTENV_CONFIG_PATH" || /^PG[A-Z]+$/.test(name)) {
    refuse(`${name} is set in the shell; unset it first.`);
  }
}

for (const arg of args) {
  if (/^(-d|--dbname|-h|--host|-p|--port|-U|--username|--service)(=|$)/.test(arg) || /^-[dhpU]./.test(arg)) {
    refuse(`argument ${arg.split("=")[0]} would redirect the connection.`);
  }
  if (/postgres(ql)?:\/\/|service=|host=|dbname=/i.test(arg)) refuse("connection strings are not accepted as arguments.");
}

if (!existsSync(ENV_FILE)) refuse(`${ENV_FILE} not found (run from FILUMIRE_CLAUDE).`);
let url = "";
for (const line of readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
  const match = /^\s*DATABASE_URL\s*=\s*(.*?)\s*$/.exec(line);
  if (match) url = match[1].replace(/^(["'])(.*)\1$/, "$2");
}
let parsed;
try {
  parsed = new URL(url);
} catch {
  refuse(`DATABASE_URL in ${ENV_FILE} is missing or invalid.`);
}
const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
if (!/^postgres(ql)?:$/.test(parsed.protocol)) refuse("DATABASE_URL is not a postgres URL.");
if (database !== EXPECTED_DATABASE) refuse(`DATABASE_URL names database "${database}", not "${EXPECTED_DATABASE}".`);
if (!ALLOWED_HOSTS.has(parsed.hostname)) refuse(`DATABASE_URL host "${parsed.hostname}" is not local.`);
if ((parsed.port || "5432") !== EXPECTED_PORT) refuse(`DATABASE_URL port "${parsed.port}" is not ${EXPECTED_PORT}.`);
if ([...parsed.searchParams.keys()].length > 0) refuse("DATABASE_URL query parameters are not accepted.");

const childEnv = { ...process.env };
childEnv.PGHOST = parsed.hostname.replace(/^\[|\]$/g, "");
childEnv.PGPORT = EXPECTED_PORT;
childEnv.PGDATABASE = EXPECTED_DATABASE;
childEnv.PGUSER = decodeURIComponent(parsed.username);
childEnv.PGPASSWORD = decodeURIComponent(parsed.password);
childEnv.PGAPPNAME = "filumire_b4";
childEnv.PGCONNECT_TIMEOUT = "5";
childEnv.PGCLIENTENCODING = "UTF8";

const fixed = tool === "psql" ? ["-X", "-v", "ON_ERROR_STOP=1", "--no-password"] : ["--no-password"];
const exe = path.join(PG_BIN, `${tool}.exe`);
if (!existsSync(exe)) refuse(`${exe} not found.`);
console.error(`[pg-env-run] ${tool} -> ${EXPECTED_DATABASE}@${childEnv.PGHOST}:${EXPECTED_PORT} as ${childEnv.PGUSER}`);
const result = spawnSync(exe, [...fixed, ...args], { env: childEnv, stdio: "inherit" });
if (result.error) {
  console.error(`[pg-env-run] could not start ${tool}: ${result.error.message}`);
  process.exit(2);
}
process.exit(result.status ?? 2);

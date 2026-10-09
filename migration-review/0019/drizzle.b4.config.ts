import { defineConfig } from "drizzle-kit";
/*
 * B4 only (artifact A1, docs/handoff/PAYMENTS_PHASE2_STEP3.md "P1 Apply path", option A): applies the reviewed
 * 0019 from the review folder, whose 0000-0018 files and journal entries are identical to ./drizzle, so 0019 is the
 * only pending migration. Never the root config, never ./drizzle. Refuses (throws) unless DATABASE_URL names
 * database filumire_test on localhost:5432. Run only with `node --env-file=.env.postgres-test.local`.
 */
const url = process.env.DATABASE_URL ?? "";
let parsed: URL;
try {
  parsed = new URL(url);
} catch {
  throw new Error("B4 config refused: DATABASE_URL is missing or invalid.");
}
const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
if (database !== "filumire_test") {
  throw new Error(`B4 config refused: DATABASE_URL names database "${database}", not "filumire_test".`);
}
if (!["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) || (parsed.port || "5432") !== "5432") {
  throw new Error("B4 config refused: DATABASE_URL must point at localhost:5432.");
}

export default defineConfig({
  schema: "./services/database-schema.ts",
  out: "./migration-review/0019/drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  migrations: { table: "__drizzle_migrations", schema: "drizzle" },
});

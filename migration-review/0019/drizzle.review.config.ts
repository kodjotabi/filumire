import { defineConfig } from "drizzle-kit";
/* B3 review only: generates into migration-review/0019/drizzle, never ./drizzle. No database URL. */
export default defineConfig({
  schema: "./services/database-schema.ts",
  out: "./migration-review/0019/drizzle",
  dialect: "postgresql",
});

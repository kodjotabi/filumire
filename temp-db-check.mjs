import { db } from "./services/database.ts";
import { sql } from "drizzle-orm";

const result = await db.execute(
  sql`
    SELECT
      column_name,
      data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'learning_evidence'
    ORDER BY ordinal_position;
  `,
);

console.log(result.rows);

process.exit(0);
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is required for database access.",
  );
}

export const pool = new Pool({
  connectionString,

  // Prevent requests from waiting indefinitely
  // when the database cannot be reached.
  connectionTimeoutMillis: 5000,

  // Release idle database connections after
  // a controlled period.
  idleTimeoutMillis: 30000,

  // Keep the pool bounded.
  max: 10,

  // Rotate long-lived connections.
  maxLifetimeSeconds: 300,

  // Keep the application informed about unexpected
  // errors on idle pooled connections.
  onConnect: async (client) => {
    await client.query(
      "SET statement_timeout = 10000",
    );

    await client.query(
      "SET lock_timeout = 5000",
    );

    await client.query(
      "SET idle_in_transaction_session_timeout = 10000",
    );
  },
});

pool.on(
  "error",
  (error) => {
    console.error(
      "FILUMIRE database pool error:",
      error,
    );
  },
);

export const db =
  drizzle(pool);
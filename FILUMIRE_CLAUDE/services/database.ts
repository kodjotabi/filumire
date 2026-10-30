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

  // Release idle database connections quickly:
  // warm serverless instances must not hold them.
  idleTimeoutMillis: 10000,

  // Each Vercel instance has its own pool, and the
  // filumire_app role allows 20 connections in all
  // (scripts/create-app-role.mjs). 10 per instance
  // exhausted it in Production on 29 Oct 2026; 3
  // leaves room for several warm instances.
  // Requests beyond 3 wait, up to connectionTimeoutMillis.
  max: 3,

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
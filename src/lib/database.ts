import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
let pool: Pool;
export function database() {
  if (!process.env.DATABASE_URL) throw Error("Database unavailable");
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 10000,
    });
    attachDatabasePool(pool);
  }
  return pool;
}

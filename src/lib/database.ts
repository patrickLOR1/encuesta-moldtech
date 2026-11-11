import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
let pool: Pool;
export function database() {
  if (!process.env.DATABASE_URL) throw Error("Database unavailable");
  if (!pool) {
    const connection = new URL(process.env.DATABASE_URL);
    if(connection.hostname.endsWith(".neon.tech") && connection.searchParams.get("sslmode") === "require") connection.searchParams.set("sslmode","verify-full");
    pool = new Pool({
      connectionString: connection.toString(),
      max: 5,
      connectionTimeoutMillis: 10000,
    });
    attachDatabasePool(pool);
  }
  return pool;
}

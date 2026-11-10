import pg from "pg";
import { readFile } from "node:fs/promises";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await db.connect();
  await db.query(
    await readFile(
      new URL("../db/002-admin-email.sql", import.meta.url),
      "utf8",
    ),
  );
  const { rows } = await db.query(
    "select email from app_users where email=any($1::text[])",
    [["jl.rangel@moldtech.mx", "jl.rangel@moldtech.com"]],
  );
  if (rows.length !== 1 || rows[0].email !== "jl.rangel@moldtech.mx")
    throw Error("Verification failed");
  console.log("Verified administrator: jl.rangel@moldtech.mx");
} catch {
  console.error("Email correction failed; inspect administrator records.");
  process.exitCode = 1;
} finally {
  await db.end();
}

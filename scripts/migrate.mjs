import { readFile, readdir } from "node:fs/promises";
import pg from "pg";
const raw = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!raw) throw Error("Private DATABASE_URL required");
const url = new URL(raw);
url.hostname = url.hostname.replace("-pooler.", ".");
url.searchParams.set("sslmode", "verify-full");
const client = new pg.Client({ connectionString: url.toString() });
try {
  await client.connect();
  await client.query("select pg_advisory_lock(719285)");
  const { rows: [existing] } = await client.query(
    "select to_regclass('public.schema_migrations') ledger, to_regclass('public.prospectos') leads, to_regclass('public.app_users') users",
  );
  if (!existing.ledger && (existing.leads || existing.users))
    throw Error("Existing schema requires reconciliation before migration");
  await client.query(
    "create table if not exists schema_migrations(name text primary key,applied_at timestamptz not null default now())",
  );
  for (const name of (await readdir(new URL("../db/", import.meta.url)))
    .filter((n) => /^\d+.*\.sql$/.test(n))
    .sort()) {
    if (
      (
        await client.query("select 1 from schema_migrations where name=$1", [
          name,
        ])
      ).rowCount
    )
      continue;
    const source = (await readFile(new URL("../db/" + name, import.meta.url), "utf8")).trim();
    // The versioned SQL files are also runnable on their own.
    const sql = source.replace(/^(?:--[^\n]*\n\s*)+/, "");
    if (!/^begin;/i.test(sql) || !/commit;$/i.test(source))
      throw Error("Migration must have one outer transaction");
    await client.query("begin");
    try {
      await client.query(sql.replace(/^begin;/i, "").replace(/commit;$/i, ""));
      await client.query("insert into schema_migrations(name) values($1)", [name]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
    console.log(`Applied ${name}`);
  }
} catch {
  console.error("Migration failed; no credentials logged.");
  process.exitCode = 1;
} finally {
  await client.end();
}

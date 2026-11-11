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
    await client.query(
      await readFile(new URL("../db/" + name, import.meta.url), "utf8"),
    );
    await client.query("insert into schema_migrations(name) values($1)", [
      name,
    ]);
    console.log(`Applied ${name}`);
  }
} catch {
  console.error("Migration failed; no credentials logged.");
  process.exitCode = 1;
} finally {
  await client.end();
}

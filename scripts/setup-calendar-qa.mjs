import pg from "pg";
import { readFile, writeFile } from "node:fs/promises";
const u = new URL(process.env.DATABASE_URL);
if (!process.env.QA_BRANCH_HOST || u.hostname !== process.env.QA_BRANCH_HOST) throw Error("Set QA_BRANCH_HOST to the independently verified isolated branch host before initialization");
const c = new pg.Client({ connectionString: u.toString() });
await c.connect();
if (
  !(
    await c.query(
      "select 1 from pg_database where datname='moldtech_calendar_qa'",
    )
  ).rowCount
)
  await c.query("create database moldtech_calendar_qa");
await c.end();
u.pathname = "/moldtech_calendar_qa";
await writeFile(
  ".env.qa.local",
  `DATABASE_URL=${u}\nFORMSPREE_ENABLED=false\nSMTP_ENABLED=false\n`,
);
const db = new pg.Client({ connectionString: u.toString() });
await db.connect();
for (const file of ["001-neon.sql", "003-meetings.sql"])
  await db.query(await readFile(`db/${file}`, "utf8"));
console.log(
  "Isolated QA database initialized; migrations 001 and 003 applied.",
);
await db.end();

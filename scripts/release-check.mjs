import pg from "pg";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await db.connect();
  const a = await db.query("select must_change_password,active from app_users");
  const b = await db.query("select count(*)::int as count from prospectos");
  console.log(
    JSON.stringify({
      users: a.rows,
      prospectos: b.rows[0].count,
      formspreeEnabled: process.env.FORMSPREE_ENABLED === "true",
    }),
  );
} finally {
  await db.end();
}

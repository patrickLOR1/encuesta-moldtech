import { chromium } from "@playwright/test";
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomUUID, randomBytes } from "node:crypto";
process.loadEnvFile(".env.qa.local");
process.loadEnvFile(".env.preview-qa.local");
const dbUrl = process.env.DATABASE_URL;
if (new URL(dbUrl).pathname !== "/moldtech_calendar_qa")
  throw Error("QA database required");
const base = process.env.PREVIEW_URL,
  access = process.env.PREVIEW_ACCESS_URL;
if (!base?.includes(".vercel.app") || !access?.startsWith(base))
  throw Error("Exact Preview target required");
const c = new pg.Client({ connectionString: dbUrl });
await c.connect();
const email = `preview-${randomUUID()}@example.invalid`,
  password = randomBytes(24).toString("hex"),
  leadEmail = `preview-lead-${randomUUID()}@example.invalid`;
const user = (
  await c.query(
    "insert into app_users(email,password_hash,must_change_password) values($1,$2,false) returning id",
    [email, await bcrypt.hash(password, 12)],
  )
).rows[0];
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();
let passed = 0;
const check = (value, label) => {
  if (!value) throw Error(label);
  passed++;
  console.log("PASS " + label);
};
try {
  const response = await page.goto(access);
  await page.waitForURL((url) => url.origin === base);
  check(response.status() < 400, "Preview root responds");
  check(
    (await page.getByRole("button", { name: "Iniciar sesión" }).count()) === 1,
    "Real login required; no demo entry",
  );
  check(
    (await context.request.get(base + "/api/leads")).status() === 401,
    "Unauthenticated leads denied",
  );
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await page
    .getByRole("heading", { name: "Conexiones que crecen." })
    .waitFor({ timeout: 30000 });
  check(true, "Real server login into isolated QA");
  const integration = await (
    await context.request.get(base + "/api/integrations/status")
  ).json();
  check(
    integration.smtp.valid &&
      integration.smtp.passwordPresent &&
      !integration.smtp.enabled,
    "Private Gmail configuration present and sending disabled",
  );
  check(!integration.formspree.enabled, "Formspree disabled in QA");
  await page.getByRole("button", { name: "+ Nuevo prospecto" }).click();
  await page.getByLabel("1. Nombre completo").fill("Visitante Preview QA");
  await page.getByLabel("2. Empresa").fill("Empresa Preview QA");
  await page.getByLabel("5. Correo electrónico").fill(leadEmail);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  check(
    (await page.getByText("13. Fecha para la siguiente reunión").count()) === 1,
    "Question 13 present",
  );
  await page.getByRole("button", { name: "Guardar prospecto" }).click();
  await page
    .getByRole("button", { name: "Registrar otro prospecto" })
    .waitFor({ timeout: 30000 });
  check(true, "Browser capture saved");
  await page.reload();
  await page
    .getByRole("row")
    .filter({ hasText: "Empresa Preview QA" })
    .first()
    .waitFor({ timeout: 30000 });
  check(true, "Persistent dashboard after reload");
  const row = (
    await c.query("select * from prospectos where email_key=$1", [leadEmail])
  ).rows[0];
  check(Boolean(row), "Write verified directly in Neon QA");
  check(
    (await c.query("select * from meetings where prospecto_id=$1", [row.id]))
      .rowCount === 1,
    "Relational pending meeting persisted",
  );
  check(
    (await context.request.get(base + "/api/meetings")).status() === 200,
    "Calendar endpoint works",
  );
  check(
    (
      await context.request.get(
        base + "/api/meetings/availability?date=2032-06-01&duration=30",
      )
    ).status() === 200,
    "Availability endpoint works",
  );
  await page.screenshot({
    path: "test-results/preview-390.png",
    fullPage: true,
  });
  check(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Preview mobile width",
  );
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.getByRole("button", { name: "Iniciar sesión" }).waitFor();
  check(
    (await context.request.get(base + "/api/leads")).status() === 401,
    "Logout revokes access",
  );
  console.log(`${passed} Preview checks passed; no real messages sent`);
} finally {
  await browser.close();
  await c.query("delete from app_sessions where user_id=$1", [user.id]);
  await c.query("update app_users set active=false where id=$1", [user.id]);
  await c.end();
}

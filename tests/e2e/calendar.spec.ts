import { test, expect } from "@playwright/test";
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
process.loadEnvFile(".env.qa.local");
const url = process.env.DATABASE_URL!;
if (new URL(url).pathname !== "/moldtech_calendar_qa")
  throw Error("Isolated QA database required");
const password = randomBytes(18).toString("hex"),
  email = `qa-${Date.now()}@example.invalid`;
let userId: string;
test.beforeAll(async () => {
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  userId = (
    await c.query(
      "insert into app_users(email,password_hash,must_change_password) values($1,$2,false) returning id",
      [email, await bcrypt.hash(password, 12)],
    )
  ).rows[0].id;
  await c.end();
});
async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("Correo", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  try {
    await expect(page.getByText("Conexiones que crecen.")).toBeVisible();
  } catch (e) {
    await page.getByLabel("Contraseña", { exact: true }).fill("");
    throw e;
  }
}
test("login, capture, Neon persistence, edit, calendar, trash and restore", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "+ Nuevo prospecto" }).click();
  await page.getByLabel("1. Nombre completo").fill("Visitante QA");
  await page.getByLabel("2. Empresa").fill("Empresa QA " + userId);
  await page
    .getByLabel("5. Correo electrónico")
    .fill(`lead-${userId}@example.invalid`);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("7. Número de máquinas").fill("12");
  await page.getByRole("button", { name: "Inyectoras", exact: true }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByText("13. Fecha para la siguiente reunión"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Guardar prospecto" }).click();
  await expect(
    page.getByRole("button", { name: "Registrar otro prospecto" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Empresa QA " + userId, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("row")
    .filter({ hasText: "Empresa QA " + userId })
    .getByRole("button", { name: "Ver ficha" })
    .click();
  await page.getByRole("button", { name: "Editar las 13 respuestas" }).click();
  await page.getByLabel("3. Puesto").fill("Responsable QA");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Guardar prospecto" }).click();
  await expect(page.getByText("Responsable QA", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: /Empresa QA.*Visitante QA/ }).click();
  await page.getByLabel("Fecha", { exact: true }).fill("2030-06-01");
  await page.getByLabel("Hora", { exact: true }).fill("10:00");
  await page.getByRole("button", { name: "Guardar horario" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("row")
    .filter({ hasText: "Empresa QA " + userId })
    .getByRole("button", { name: "Ver ficha" })
    .click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Quitar prospecto" }).click();
  await page.getByRole("button", { name: "Ver papelera" }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Empresa QA " + userId })
    .getByRole("button", { name: "Ver ficha" })
    .click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Restaurar prospecto" }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("button", { name: "Iniciar sesión" }),
  ).toBeVisible();
});
test("unauthorized endpoints and cross-origin writes rejected", async ({
  request,
}) => {
  for (const path of ["leads", "meetings"])
    expect((await request.get("/api/" + path)).status()).toBe(401);
  expect(
    (
      await request.post("/api/leads", {
        headers: { Origin: "https://invalid.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
});
for (const width of [375, 390, 768, 1024, 1440])
  test(`responsive ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.screenshot({
      path: `test-results/login-${width}.png`,
      fullPage: true,
    });
    await login(page);
    await expect(
      page.getByRole("heading", { name: "Calendario", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/dashboard-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("heading", { name: "Calendario", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/calendar-${width}.png` });
    await page.getByRole("button", { name: "Semana", exact: true }).click();
    await expect(page.getByLabel("Vista semanal")).toBeVisible();
    await page.getByRole("button", { name: "Día", exact: true }).click();
    await page.getByRole("button", { name: "+ Nuevo prospecto" }).click();
    await page.screenshot({ path: `test-results/form-${width}.png` });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

test("browser validates contacts and past dates; search filters and CSV work", async ({
  page,
}) => {
  await login(page);
  const company = "Validación QA " + userId;
  await page.getByRole("button", { name: "+ Nuevo prospecto" }).click();
  await page.getByLabel("1. Nombre completo").fill("Validación QA");
  await page.getByLabel("2. Empresa").fill(company);
  await page.getByLabel("4. Teléfono").fill("abc");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByText("Teléfono inválido", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("4. Teléfono").fill("");
  await page.getByLabel("5. Correo electrónico").fill("incorrecto");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(
    page.getByText("Correo inválido", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("5. Correo electrónico")
    .fill(`validation-${userId}@example.invalid`);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Fecha", { exact: true }).fill("2000-01-01");
  await page.getByLabel("Hora · Ciudad de México").fill("10:00");
  await page.getByRole("button", { name: "Guardar prospecto" }).click();
  await expect(
    page.getByText("La reunión debe ser en el futuro.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/past-date-error.png" });
  await page.getByLabel("Fecha", { exact: true }).fill("");
  await page.getByLabel("Hora · Ciudad de México").fill("");
  await page.getByRole("button", { name: "Guardar prospecto" }).click();
  await expect(
    page.getByRole("button", { name: "Registrar otro prospecto" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/save-confirmation.png" });
  await page.getByLabel("Buscar por nombre o empresa").fill(company);
  await expect(page.getByRole("row").filter({ hasText: company })).toHaveCount(
    1,
  );
  await page
    .getByRole("row")
    .filter({ hasText: company })
    .getByRole("button", { name: "Ver ficha" })
    .click();
  await page.getByLabel(/^Interés/).selectOption("Alto");
  await page.getByRole("button", { name: "Guardar seguimiento" }).click();
  await expect(
    page.getByText("Cambios guardados", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByLabel("Filtrar interés").selectOption("Bajo");
  await expect(
    page.getByText("No hay prospectos con estos filtros."),
  ).toBeVisible();
  await page.getByLabel("Filtrar interés").selectOption("Alto");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  const { readFile } = await import("node:fs/promises");
  const csv = await readFile(path!, "utf8");
  expect(csv).toContain(company);
  expect(csv).toContain("Fecha para la siguiente reunión");
  expect(csv).not.toContain("¿Les gustaría agendar una demostración?");
});

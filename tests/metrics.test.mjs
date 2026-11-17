import test from "node:test";
import assert from "node:assert/strict";
import { commercialMetrics } from "../src/lib/metrics.ts";
const row = {
  created_at: "2026-11-09T12:00:00Z",
  answers: { demoInterest: "Sí" },
  tracking: { status: "Nuevo", interest: "Alto" },
};
test("demos pendientes excluye papelera", () =>
  assert.equal(
    commercialMetrics([{ ...row, deleted_at: "2026-11-09T13:00:00Z" }, row])
      .demos,
    1,
  ));
test("por contactar excluye papelera", () =>
  assert.equal(
    commercialMetrics([{ ...row, deleted_at: "2026-11-09T13:00:00Z" }, row])
      .contact,
    1,
  ));
test("todas las métricas excluyen papelera", () =>
  assert.deepEqual(
    commercialMetrics([{ ...row, deleted_at: "2026-11-09T13:00:00Z" }]),
    { total: 0, high: 0, demos: 0, contact: 0, today: 0 },
  ));
test("registros del día usan México y no UTC", () =>
  assert.equal(
    commercialMetrics(
      [{ ...row, created_at: "2026-11-10T02:00:00Z" }],
      new Date("2026-11-09T18:00:00Z"),
    ).today,
    1,
  ));

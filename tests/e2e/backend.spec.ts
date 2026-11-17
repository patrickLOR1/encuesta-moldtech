import { test, expect } from "@playwright/test";
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomUUID, randomBytes } from "node:crypto";
process.loadEnvFile(".env.qa.local");
const url = process.env.DATABASE_URL!;
if (new URL(url).pathname !== "/moldtech_calendar_qa")
  throw Error("QA required");
test("concurrent overlap, idempotency, reprogramming and cancellation persist in Neon", async ({
  request,
}) => {
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  const email = `api-${randomUUID()}@example.invalid`,
    password = randomBytes(18).toString("hex");
  await db.query(
    "insert into app_users(email,password_hash,must_change_password) values($1,$2,false)",
    [email, await bcrypt.hash(password, 12)],
  );
  const headers = { Origin: "http://localhost:3200" };
  expect(
    (
      await request.post("/api/session", { headers, data: { email, password } })
    ).status(),
  ).toBe(200);
  const lead = (time: string) => ({
    id: randomUUID(),
    answers: {
      fullName: "Prueba de concurrencia",
      company: "QA aislado",
      email: `lead-${randomUUID()}@example.invalid`,
      meetingDate: "2031-01-10",
      meetingTime: time,
      meetingDuration: "30",
      meetingConfirmed: true,
    },
    tracking: {},
  });
  const first = lead("10:00"),
    second = lead("10:00");
  const results = await Promise.all(
    [first, second].map((data) =>
      request.post("/api/leads", { headers, data }),
    ),
  );
  expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
  const winner = results[0].ok() ? first : second;
  expect(
    (await request.post("/api/leads", { headers, data: winner })).status(),
  ).toBe(200);
  let m = (
    await db.query("select * from meetings where prospecto_id=$1", [winner.id])
  ).rows[0];
  expect(
    (
      await db.query(
        "select count(*)::int n from invitation_outbox where meeting_id=$1",
        [m.id],
      )
    ).rows[0].n,
  ).toBe(1);
  const uid = m.calendar_uid;
  expect(
    (
      await request.post("/api/meetings", {
        headers,
        data: {
          id: m.id,
          sequence: 0,
          action: "reschedule",
          date: "2031-01-10",
          time: "11:00",
          duration: "30",
          confirmed: true,
        },
      })
    ).status(),
  ).toBe(200);
  m = (await db.query("select * from meetings where id=$1", [m.id])).rows[0];
  expect(m.calendar_uid).toBe(uid);
  expect(m.calendar_sequence).toBe(1);
  expect(m.fecha_inicio_utc.toISOString()).toBe("2031-01-10T17:00:00.000Z");
  expect(
    (
      await request.post("/api/meetings", {
        headers,
        data: { id: m.id, sequence: 1, action: "cancel" },
      })
    ).status(),
  ).toBe(200);
  m = (await db.query("select * from meetings where id=$1", [m.id])).rows[0];
  expect(m.estado).toBe("cancelled");
  expect(m.calendar_sequence).toBe(2);
  expect(m.calendar_uid).toBe(uid);
  expect(
    (
      await db.query(
        "select method from invitation_outbox where meeting_id=$1 and sequence=2",
        [m.id],
      )
    ).rows[0].method,
  ).toBe("CANCEL");
  await db.end();
});
test("wrong login has no ordinary wait; burst limit and expired session enforced", async ({
  request,
}) => {
  const headers = { Origin: "http://localhost:3200" },
    email = `invalid-${randomUUID()}@example.invalid`;
  for (let i = 0; i < 6; i++)
    expect(
      (
        await request.post("/api/session", {
          headers,
          data: { email, password: "invalid" },
        })
      ).status(),
    ).toBe(401);
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  const { createHash } = await import("node:crypto");
  await db.query("update login_attempts set attempts=30 where email=$1", [
    createHash("sha256").update(email).digest("hex"),
  ]);
  expect(
    (
      await request.post("/api/session", {
        headers,
        data: { email, password: "invalid" },
      })
    ).status(),
  ).toBe(429);
  expect(
    (
      await request.get("/api/leads", {
        headers: { Cookie: "mt-session=expired" },
      })
    ).status(),
  ).toBe(401);
  await db.end();
});

test("initial password change revokes sessions and unlocks access", async ({
  request,
}) => {
  const db = new pg.Client({ connectionString: url });
  await db.connect();
  const email = `change-${randomUUID()}@example.invalid`,
    password = randomBytes(18).toString("hex"),
    next = randomBytes(18).toString("hex");
  const u = (
    await db.query(
      "insert into app_users(email,password_hash) values($1,$2) returning id",
      [email, await bcrypt.hash(password, 12)],
    )
  ).rows[0];
  const headers = { Origin: "http://localhost:3200" };
  expect(
    (
      await request.post("/api/session", { headers, data: { email, password } })
    ).status(),
  ).toBe(200);
  expect((await request.get("/api/leads")).status()).toBe(401);
  expect(
    (
      await request.patch("/api/session", { headers, data: { password: next } })
    ).status(),
  ).toBe(200);
  expect((await request.get("/api/session")).status()).toBe(401);
  expect(
    (
      await request.post("/api/session", {
        headers,
        data: { email, password: next },
      })
    ).status(),
  ).toBe(200);
  expect((await request.get("/api/leads")).status()).toBe(200);
  await db.query(
    "update app_sessions set expires_at=now()-interval '1 second' where user_id=$1",
    [u.id],
  );
  expect((await request.get("/api/leads")).status()).toBe(401);
  await db.end();
});

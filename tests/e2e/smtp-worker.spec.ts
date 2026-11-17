import { test, expect } from "@playwright/test";
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomUUID, randomBytes } from "node:crypto";
import { processInvitation } from "../../src/lib/invitation-worker";
import { invitationMessage } from "../../src/lib/invitation";
import { smtpConfiguration } from "../../src/lib/smtp-config";
process.loadEnvFile(".env.qa.local");
if (new URL(process.env.DATABASE_URL!).pathname !== "/moldtech_calendar_qa")
  throw Error("QA required");
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
let owner: string,
  day = 0;
test.beforeAll(async () => {
  owner = (
    await db.query(
      "insert into app_users(email,password_hash,active) values($1,$2,false) returning id",
      [
        `smtp-${randomUUID()}@example.invalid`,
        await bcrypt.hash(randomBytes(24).toString("hex"), 12),
      ],
    )
  ).rows[0].id;
});
test.afterAll(async () => {
  await db.end();
});
async function fixture() {
  const lead = randomUUID(),
    meeting = randomUUID(),
    email = `invite-${randomUUID()}@example.invalid`,
    start = new Date(Date.UTC(2035, 0, ++day, 16)),
    end = new Date(start.getTime() + 1800000);
  await db.query(
    "insert into prospectos(id,created_by,answers,tracking,email_key) values($1,$2,$3,$4,$5)",
    [
      lead,
      owner,
      JSON.stringify({ fullName: "Fixture SMTP", company: "QA SMTP", email }),
      JSON.stringify({ status: "Nuevo", notes: "Nota confidencial excluida" }),
      email,
    ],
  );
  await db.query(
    "insert into meetings(id,prospecto_id,responsable_id,fecha_inicio_utc,fecha_fin_utc,estado,email_invitado,confirmed,idempotency_key) values($1,$2,$3,$4,$5,'scheduled',$6,true,$2)",
    [meeting, lead, owner, start, end, email],
  );
  const row = (await db.query("select * from meetings where id=$1", [meeting]))
    .rows[0];
  await db.query(
    "insert into invitation_outbox(meeting_id,sequence,method,payload) values($1,0,'REQUEST',$2)",
    [
      meeting,
      JSON.stringify({
        uid: row.calendar_uid,
        sequence: 0,
        start: start.toISOString(),
        end: end.toISOString(),
        email,
        company: "QA SMTP",
        method: "REQUEST",
      }),
    ],
  );
  return { lead, meeting, email };
}
async function state(id: string) {
  return (
    await db.query(
      "select m.invitation_status,o.status,o.attempts from meetings m join invitation_outbox o on o.meeting_id=m.id where m.id=$1",
      [id],
    )
  ).rows[0];
}
test("SMTP configuration validates Gmail without exposing secret", () => {
  const result = smtpConfiguration({
    SMTP_HOST: "smtp.gmail.com",
    SMTP_PORT: "465",
    SMTP_SECURE: "true",
    SMTP_USER: "jl.rangel@moldtech.mx",
    SMTP_FROM: "jl.rangel@moldtech.mx",
    SMTP_APP_PASSWORD: "synthetic-test-only",
    SMTP_ENABLED: "false",
  });
  expect(result.valid).toBe(true);
  expect(result.enabled).toBe(false);
  expect(JSON.stringify(result)).not.toContain("synthetic-test-only");
  expect(smtpConfiguration({}).valid).toBe(false);
});
test("concurrent workers send once and persist SMTP acceptance", async () => {
  const f = await fixture();
  let calls = 0;
  const send = async (event: Parameters<typeof invitationMessage>[0]) => {
    calls++;
    const message = invitationMessage(event, "jl.rangel@moldtech.mx");
    expect(message.to).toBe(f.email);
    expect(message.from).toBe("jl.rangel@moldtech.mx");
    expect(message.icalEvent.content).not.toContain("confidencial");
    return { accepted: [f.email] };
  };
  await Promise.all([
    processInvitation(db, send, f.meeting),
    processInvitation(db, send, f.meeting),
  ]);
  expect(calls).toBe(1);
  expect(await state(f.meeting)).toMatchObject({
    status: "sent",
    invitation_status: "sent",
    attempts: 1,
  });
  expect(await processInvitation(db, send, f.meeting)).toBe("empty");
  expect(calls).toBe(1);
});
test("explicit SMTP rejection persists and manual retry succeeds", async () => {
  const f = await fixture();
  await processInvitation(
    db,
    async () => {
      throw { responseCode: 550 };
    },
    f.meeting,
  );
  expect(await state(f.meeting)).toMatchObject({
    status: "failed",
    invitation_status: "failed",
    attempts: 1,
  });
  await db.query(
    "update invitation_outbox set status='pending' where meeting_id=$1 and status='failed'",
    [f.meeting],
  );
  await processInvitation(db, async () => ({ accepted: [f.email] }), f.meeting);
  expect(await state(f.meeting)).toMatchObject({ status: "sent", attempts: 2 });
});
test("ambiguous SMTP timeout persists and is never automatically retried", async () => {
  const f = await fixture();
  let calls = 0;
  const send = async () => {
    calls++;
    throw { code: "ETIMEDOUT" };
  };
  await processInvitation(db, send, f.meeting);
  await processInvitation(db, send, f.meeting);
  expect(calls).toBe(1);
  expect(await state(f.meeting)).toMatchObject({
    status: "unknown",
    invitation_status: "unknown",
    attempts: 1,
  });
});
test("interrupted sender becomes unknown without resending", async () => {
  const f = await fixture();
  await db.query(
    "update invitation_outbox set status='sending',claimed_at=now()-interval '10 minutes' where meeting_id=$1",
    [f.meeting],
  );
  let calls = 0;
  await processInvitation(
    db,
    async () => {
      calls++;
      return { accepted: [f.email] };
    },
    f.meeting,
  );
  expect(calls).toBe(0);
  expect(await state(f.meeting)).toMatchObject({
    status: "unknown",
    invitation_status: "unknown",
  });
});
test("archived prospect does not send pending invitation", async () => {
  const f = await fixture();
  await db.query("update prospectos set deleted_at=now() where id=$1", [
    f.lead,
  ]);
  let calls = 0;
  await processInvitation(
    db,
    async () => {
      calls++;
      return { accepted: [f.email] };
    },
    f.meeting,
  );
  expect(calls).toBe(0);
  expect(await state(f.meeting)).toMatchObject({
    status: "pending",
    attempts: 0,
  });
});

import { smtpOutcome } from "./smtp-result";
import nodemailer from "nodemailer";
import { database } from "./database";
import { invitationMessage } from "./invitation";
export async function deliverInvitations(meetingId?: string) {
  if (process.env.SMTP_ENABLED !== "true") return;
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_APP_PASSWORD,
    SMTP_FROM,
    SMTP_SECURE,
  } = process.env;
  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_APP_PASSWORD ||
    SMTP_FROM !== "jl.rangel@moldtech.mx"
  )
    return;
  const db = database();
  // An interrupted sender may already have delivered: never retry it blindly.
  await db.query(
    "with stale as (update invitation_outbox set status='unknown' where status='sending' and claimed_at<now()-interval '5 minutes' returning meeting_id,sequence) update meetings m set invitation_status='unknown' from stale s where m.id=s.meeting_id and m.calendar_sequence=s.sequence",
  );
  const claim = await db.connect();
  let job;
  try {
    await claim.query("begin");
    const candidate = (
      await claim.query(
        "select m.id from meetings m where ($1::uuid is null or m.id=$1) and exists(select 1 from invitation_outbox o where o.meeting_id=m.id and o.status='pending') order by m.created_at for update skip locked limit 1",
        [meetingId || null],
      )
    ).rows[0];
    job = (
      await claim.query(
        "update invitation_outbox set status='sending',claimed_at=now(),attempts=attempts+1 where status='pending' and meeting_id=$1 and id=(select id from invitation_outbox where status='pending' and meeting_id=$1 order by created_at for update skip locked limit 1) returning *",
        [candidate?.id || null],
      )
    ).rows[0];
    await claim.query("commit");
  } catch (e) {
    await claim.query("rollback");
    throw e;
  } finally {
    claim.release();
  }
  if (!job) return;
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    requireTLS: SMTP_SECURE !== "true",
    auth: { user: SMTP_USER, pass: SMTP_APP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    logger: false,
    debug: false,
  });
  const status = await smtpOutcome(
    () => transport.sendMail(invitationMessage(job.payload, SMTP_FROM)),
    job.payload.email,
  );
  transport.close();
  const c = await db.connect();
  try {
    await c.query("begin");
    await c.query(
      "update invitation_outbox set status=$1,finished_at=now() where id=$2",
      [status, job.id],
    );
    await c.query(
      "update meetings set invitation_status=$1,invitation_sent_at=case when $1='sent' then now() else invitation_sent_at end where id=$2 and calendar_sequence=$3",
      [status, job.meeting_id, job.sequence],
    );
    await c.query("commit");
  } catch (e) {
    await c.query("rollback");
    throw e;
  } finally {
    c.release();
  }
}

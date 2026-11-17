import type { Pool } from "pg";
import type { Invitation } from "./invitation";
import { smtpOutcome } from "./smtp-result";
export async function processInvitation(
  db: Pool,
  send: (event: Invitation) => Promise<{ accepted: unknown[] }>,
  meetingId?: string,
) {
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
        "select m.id from meetings m where ($1::uuid is null or m.id=$1) and exists(select 1 from prospectos p where p.id=m.prospecto_id and p.deleted_at is null) and exists(select 1 from invitation_outbox o where o.meeting_id=m.id and o.status='pending') order by m.created_at for update skip locked limit 1",
        [meetingId || null],
      )
    ).rows[0];
    job = (
      await claim.query(
        "update invitation_outbox set status='sending',claimed_at=now(),attempts=attempts+1 where status='pending' and meeting_id=$1 and id=(select id from invitation_outbox where status='pending' and meeting_id=$1 order by created_at for update skip locked limit 1) returning *",
        [candidate?.id || null],
      )
    ).rows[0];
    if (job)
      await claim.query(
        "update meetings set invitation_status='sending' where id=$1 and calendar_sequence=$2",
        [job.meeting_id, job.sequence],
      );
    await claim.query("commit");
  } catch (e) {
    await claim.query("rollback");
    throw e;
  } finally {
    claim.release();
  }
  if (!job) return "empty";
  const status = await smtpOutcome(() => send(job.payload), job.payload.email);
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
  return status;
}

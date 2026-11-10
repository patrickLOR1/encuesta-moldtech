import type { PoolClient } from "pg";
import { meetingError, meetingInstant } from "./meeting-time";
import type { z } from "zod";
import type { leadSchema } from "./validation";
type Answers = z.infer<typeof leadSchema>;
export async function saveMeeting(
  c: PoolClient,
  leadId: string,
  userId: string,
  a: Answers,
) {
  const previous = (
    await c.query("select * from meetings where prospecto_id=$1 for update", [
      leadId,
    ])
  ).rows[0];
  const start = a.meetingDate
    ? meetingInstant(a.meetingDate, a.meetingTime)
    : null;
  const end = start
    ? new Date(
        Date.parse(start) + Number(a.meetingDuration) * 60000,
      ).toISOString()
    : null;
  if (
    previous &&
    String(previous.fecha_inicio_utc?.toISOString() || "") === (start || "") &&
    String(previous.fecha_fin_utc?.toISOString() || "") === (end || "") &&
    (previous.estado !== "pending" || previous.email_invitado === (a.email || null)) &&
    previous.confirmed === a.meetingConfirmed
  )
    return previous;
  const error = meetingError(a);
  if (error) throw new Error(error);
  if (previous && previous.estado !== "pending")
    throw new Error("Reprograma o cancela la reunión desde Calendario.");
  const values = [
    leadId,
    userId,
    start,
    end,
    a.email || null,
    a.meetingConfirmed,
    start ? "scheduled" : "pending",
    leadId,
  ];
  const row = (
    await c.query(
      `insert into meetings(prospecto_id,responsable_id,fecha_inicio_utc,fecha_fin_utc,email_invitado,confirmed,estado,idempotency_key)
 values($1,$2,$3,$4,$5,$6,$7,$8) on conflict(prospecto_id) do update set fecha_inicio_utc=$3,fecha_fin_utc=$4,email_invitado=$5,confirmed=$6,estado=$7,updated_at=now() returning *`,
      values,
    )
  ).rows[0];
  await queueInvitation(c, row, a.company);
  return row;
}
export async function queueInvitation(
  c: PoolClient,
  row: Record<string, unknown>,
  company: string,
) {
  if (!row.confirmed || !row.email_invitado || !row.fecha_inicio_utc) {
    await c.query(
      "update meetings set invitation_status='not_requested' where id=$1",
      [row.id],
    );
    return;
  }
  const method = row.estado === "cancelled" ? "CANCEL" : "REQUEST";
  await c.query(
    "update invitation_outbox set status='superseded' where meeting_id=$1 and status='pending'",
    [row.id],
  );
  await c.query(
    "insert into invitation_outbox(meeting_id,sequence,method,payload) values($1,$2,$3,$4) on conflict(meeting_id,sequence) do nothing",
    [
      row.id,
      row.calendar_sequence,
      method,
      JSON.stringify({
        uid: row.calendar_uid,
        sequence: row.calendar_sequence,
        start: row.fecha_inicio_utc,
        end: row.fecha_fin_utc,
        email: row.email_invitado,
        company,
        method,
      }),
    ],
  );
  await c.query("update meetings set invitation_status='pending' where id=$1", [
    row.id,
  ]);
}

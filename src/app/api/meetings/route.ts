import { after } from "next/server";
import { z } from "zod";
import { team, sameOrigin } from "@/lib/server";
import { database } from "@/lib/database";
import { meetingInstant, meetingError } from "@/lib/meeting-time";
import { queueInvitation } from "@/lib/meetings";
import { deliverInvitations } from "@/lib/smtp";
const input = z.object({
  id: z.uuid(),
  sequence: z.number().int().nonnegative(),
  action: z.enum(["reschedule", "cancel", "complete", "retry"]),
  date: z.string().default(""),
  time: z.string().default(""),
  duration: z.enum(["15", "30", "45", "60", "90", "120"]).default("30"),
  confirmed: z.boolean().default(false),
});
export async function GET() {
  try {
    await team();
  } catch {
    return Response.json({ error: "Sesión requerida." }, { status: 401 });
  }
  try {
    const rows = (
      await database().query(
        `select m.*,p.answers->>'fullName' as name,p.answers->>'company' as company,u.email as responsable from meetings m join prospectos p on p.id=m.prospecto_id join app_users u on u.id=m.responsable_id where p.deleted_at is null order by m.fecha_inicio_utc nulls last`,
      )
    ).rows;
    return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "No se pudo consultar el calendario." },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  try {
    await team();
  } catch {
    return Response.json({ error: "Sesión requerida." }, { status: 401 });
  }
  const parsed = input.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Revisa los datos de la reunión." },
      { status: 400 },
    );
  const p = parsed.data,
    c = await database().connect();
  try {
    await c.query("begin");
    const m = (
      await c.query(
        `select m.*,p.answers->>'company' as company,p.answers->>'email' as contact_email from meetings m join prospectos p on p.id=m.prospecto_id where m.id=$1 and p.deleted_at is null for update of m,p`,
        [p.id],
      )
    ).rows[0];
    if (!m) throw Error("Reunión no disponible.");
    if (m.calendar_sequence !== p.sequence)
      throw Error("La reunión cambió. Actualiza el calendario.");
    if (
      (
        await c.query(
          "select id from invitation_outbox where meeting_id=$1 and status in ('sending','unknown')",
          [p.id],
        )
      ).rowCount
    )
      throw Error(
        "Hay un envío en curso o ambiguo. Revisa su resultado antes de modificar la reunión.",
      );
    if (p.action === "retry") {
      await c.query(
        "update invitation_outbox set status='pending' where meeting_id=$1 and sequence=$2 and status='failed'",
        [p.id, p.sequence],
      );
    } else if (p.action === "complete") {
      if (m.estado !== "scheduled")
        throw Error("Solo se pueden completar reuniones agendadas.");
      await c.query(
        "update meetings set estado='completed',updated_at=now() where id=$1",
        [p.id],
      );
    } else {
      if (m.estado === "cancelled" || m.estado === "completed")
        throw Error("La reunión ya está cerrada.");
      let start = m.fecha_inicio_utc,
        end = m.fecha_fin_utc;
      if (p.action === "reschedule") {
        if(m.confirmed && !p.confirmed)throw Error("Confirma el nuevo horario antes de actualizar una invitación existente.");
        const error = meetingError({
          meetingDate: p.date,
          meetingTime: p.time,
          meetingDuration: p.duration,
          meetingConfirmed: p.confirmed,
          email: m.contact_email,
        });
        if (error || !p.date) throw Error(error || "Selecciona fecha y hora.");
        start = meetingInstant(p.date, p.time);
        end = new Date(
          Date.parse(start!) + Number(p.duration) * 60000,
        ).toISOString();
      } else if (!start)
        throw Error("No hay una reunión agendada para cancelar.");
      const row = (
        await c.query(
          `update meetings set fecha_inicio_utc=$2,fecha_fin_utc=$3,estado=$4,confirmed=$5,email_invitado=$6,calendar_sequence=calendar_sequence+1,updated_at=now(),cancelled_at=case when $4='cancelled' then now() else null end where id=$1 returning *`,
          [
            p.id,
            start,
            end,
            p.action === "cancel" ? "cancelled" : "scheduled",
            p.action === "cancel" ? m.confirmed : p.confirmed,
            m.email_invitado || m.contact_email || null,
          ],
        )
      ).rows[0];
      await queueInvitation(c, row, m.company);
      // Keep capture/detail/export in sync with the authoritative meeting.
      if (p.action === "reschedule")
        await c.query(
          `update prospectos set answers=answers||$2::jsonb,updated_at=now() where id=$1`,
          [
            m.prospecto_id,
            JSON.stringify({
              meetingDate: p.date,
              meetingTime: p.time,
              meetingDuration: p.duration,
              meetingConfirmed: p.confirmed,
            }),
          ],
        );
    }
    await c.query("commit");
    after(async () => {
      try {
        await deliverInvitations(p.id);
      } catch {
        /* Review persistent outbox on next request. */
      }
    });
    return Response.json({ ok: true });
  } catch (e) {
    await c.query("rollback");
    const code = (e as { code?: string }).code;
    return Response.json(
      {
        error:
          code === "23P01"
            ? "Horario ocupado. Selecciona otro horario del calendario interno."
            : code
              ? "No se pudo actualizar la reunión."
              : (e as Error).message,
      },
      { status: 409 },
    );
  } finally {
    c.release();
  }
}

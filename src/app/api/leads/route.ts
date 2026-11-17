import { deliverInvitations } from "@/lib/smtp";
import { after } from "next/server";
import { team, sameOrigin } from "@/lib/server";
import { database } from "@/lib/database";
import { payloadSchema } from "@/lib/validation";
import { notify } from "@/lib/notify";
import { saveMeeting } from "@/lib/meetings";
export async function GET() {
  try {
    await team();
  } catch {
    return Response.json({ error: "Sesión requerida." }, { status: 401 });
  }
  try {
    return Response.json(
      (
        await database().query(
          "select * from prospectos order by created_at desc",
        )
      ).rows,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "No se pudieron consultar los prospectos." },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  let user;
  try {
    user = (await team()).user;
  } catch {
    return Response.json({ error: "Sesión requerida." }, { status: 401 });
  }
  const p = payloadSchema.safeParse(await req.json().catch(() => null));
  if (!p.success)
    return Response.json({ error: p.error.issues[0].message }, { status: 400 });
  const { id, answers, tracking } = p.data;
  const c = await database().connect();
  try {
    await c.query("begin");
    await c.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [id]);
    const existing = (
      await c.query("select * from prospectos where id=$1 for update", [id])
    ).rows[0];
    if (existing?.deleted_at)
      throw Error("Restaura el prospecto antes de editarlo.");
    if (existing?.answers.demoInterest)
      answers.demoInterest = existing.answers.demoInterest;
    const values = [
      JSON.stringify(answers),
      JSON.stringify(tracking),
      answers.email.toLowerCase() || null,
      answers.phone.replace(/\D/g, "") || null,
      id,
    ];
    const row = (
      existing
        ? await c.query(
            "update prospectos set answers=$1,tracking=$2,email_key=$3,phone_key=$4,updated_at=now() where id=$5 returning *",
            values,
          )
        : await c.query(
            "insert into prospectos(answers,tracking,email_key,phone_key,id,created_by) values($1,$2,$3,$4,$5,$6) returning *",
            [...values, user.id],
          )
    ).rows[0];
    const meeting = await saveMeeting(
      c,
      id,
      existing?.created_by || user.id,
      answers,
    );
    await c.query("commit");
    after(async () => {
      try {
        if (!existing) await notify(id);
        await deliverInvitations(meeting.id);
      } catch {
        /* Persisted state remains available for review. */
      }
    });
    return Response.json({ ...row, meeting });
  } catch (e) {
    await c.query("rollback");
    const code = (e as { code?: string }).code;
    return Response.json(
      {
        error:
          code === "23P01"
            ? "El responsable tiene otra reunión en ese horario. Elige otro horario."
            : code === "23505"
              ? "Ya existe un prospecto con ese contacto."
              : code
                ? "No se pudo guardar el prospecto."
                : (e as Error).message,
      },
      { status: code === "23P01" || code === "23505" ? 409 : 400 },
    );
  } finally {
    c.release();
  }
}

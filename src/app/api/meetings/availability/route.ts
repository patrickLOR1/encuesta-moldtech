import { z } from "zod";
import { team } from "@/lib/server";
import { database } from "@/lib/database";
import { meetingInstant } from "@/lib/meeting-time";
export async function GET(req: Request) {
  let user;
  try {
    user = (await team()).user;
  } catch {
    return Response.json({ error: "Sesión requerida." }, { status: 401 });
  }
  const q = new URL(req.url).searchParams;
  const date = q.get("date") || "",
    duration = Number(q.get("duration") || 30),
    responsible = q.get("responsible") || user.id,
    exclude = q.get("exclude");
  if (
    !meetingInstant(date, "09:00") ||
    ![15, 30, 45, 60, 90, 120].includes(duration) ||
    !z.uuid().safeParse(responsible).success ||
    (exclude && !z.uuid().safeParse(exclude).success)
  )
    return Response.json(
      { error: "Fecha o responsable inválido." },
      { status: 400 },
    );
  try {
    const { rows } = await database().query(
      `select to_char(slot at time zone 'America/Mexico_City','HH24:MI') as time from generate_series($1::timestamptz,$2::timestamptz-($3||' minutes')::interval,interval '15 minutes') slot where slot>now() and not exists(select 1 from meetings m where m.responsable_id=$4 and m.estado='scheduled' and ($5::uuid is null or m.id<>$5) and tstzrange(m.fecha_inicio_utc,m.fecha_fin_utc,'[)') && tstzrange(slot,slot+($3||' minutes')::interval,'[)')) order by slot limit 36`,
      [
        meetingInstant(date, "09:00"),
        meetingInstant(date, "18:00"),
        String(duration),
        responsible,
        exclude,
      ],
    );
    return Response.json(rows, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { error: "No se pudo comprobar la disponibilidad." },
      { status: 503 },
    );
  }
}

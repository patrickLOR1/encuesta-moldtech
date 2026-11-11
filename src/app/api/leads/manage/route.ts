import { z } from "zod";
import { team, sameOrigin } from "@/lib/server";
import { database } from "@/lib/database";
import { notify } from "@/lib/notify";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  try {
    await team();
  } catch {
    return Response.json({ error: "Sesión requerida." }, { status: 401 });
  }
  const parsed = z
    .object({ id: z.uuid(), action: z.enum(["trash", "restore", "notify"]) })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Operación o identificador inválido." },
      { status: 400 },
    );
  const { id, action } = parsed.data;
  try {
    const db = database();
    if (
      !(await db.query("select id from prospectos where id=$1", [id])).rowCount
    )
      return Response.json(
        { error: "Prospecto no encontrado." },
        { status: 404 },
      );
    if (action === "notify") await notify(id);
    else
      await db.query(
        "update prospectos set deleted_at=$1,updated_at=now() where id=$2",
        [action === "trash" ? new Date() : null, id],
      );
    return Response.json(
      (await db.query("select * from prospectos where id=$1", [id])).rows[0],
    );
  } catch {
    return Response.json(
      {
        error:
          "No se pudo completar la operación. Reintenta cuando se restablezca la conexión.",
      },
      { status: 503 },
    );
  }
}

import { z } from "zod";
import { team, sameOrigin } from "@/lib/server";
import { database } from "@/lib/database";
import { notify } from "@/lib/notify";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  try {
    await team();
    const { id, action } = z
      .object({ id: z.uuid(), action: z.enum(["trash", "restore", "notify"]) })
      .parse(await req.json());
    const db = database();
    if (action === "notify") await notify(id);
    else
      await db.query(
        "update prospectos set deleted_at=$1,updated_at=now() where id=$2",
        [action === "trash" ? new Date() : null, id],
      );
    const { rows } = await db.query("select * from prospectos where id=$1", [
      id,
    ]);
    if (!rows[0])
      return Response.json({ error: "No encontrado" }, { status: 404 });
    return Response.json(rows[0]);
  } catch {
    return Response.json(
      { error: "No se pudo completar la operación." },
      { status: 401 },
    );
  }
}

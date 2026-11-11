import { database } from "./database";
import { notificationPayload, postNotification } from "./formspree";
export async function notify(id: string) {
  if (process.env.FORMSPREE_ENABLED !== "true") return "pending";
  const db = database();
  const claim = await db.query(
    "update prospectos set notification_status='sending' where id=$1 and notification_status='pending' and deleted_at is null returning *",
    [id],
  );
  if (!claim.rows[0]) return "pending";
  const status = await postNotification(
    notificationPayload({
      ...claim.rows[0],
      created_at: claim.rows[0].created_at.toISOString(),
    }),
  );
  await db.query(
    "update prospectos set notification_status=$1 where id=$2 and notification_status='sending'",
    [status, id],
  );
  return status;
}

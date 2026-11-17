import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { database } from "./database";
export const tokenHash = (s: string) =>
  createHash("sha256").update(s).digest("hex");
export async function team(allowChange = false) {
  const token = (await cookies()).get("mt-session")?.value;
  if (!token) throw Error("Unauthorized");
  const { rows } = await database().query(
    "select u.id,u.email,u.must_change_password from app_sessions s join app_users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now() and u.active=true",
    [tokenHash(token)],
  );
  const user = rows[0];
  if (!user || (!allowChange && user.must_change_password))
    throw Error("Unauthorized");
  return { user };
}
export function sameOrigin(req: Request) {
  return req.headers.get("origin") === new URL(req.url).origin;
}

import { team } from "@/lib/server";
import { smtpConfiguration } from "@/lib/smtp-config";
export async function GET() {
  try {
    await team();
  } catch {
    return Response.json({ error: "Sesión requerida." }, { status: 401 });
  }
  return Response.json(
    {
      smtp: smtpConfiguration(process.env),
      formspree: {
        enabled: process.env.FORMSPREE_ENABLED === "true",
        recipientVerified: false,
      },
      environment: process.env.VERCEL_ENV || "local",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

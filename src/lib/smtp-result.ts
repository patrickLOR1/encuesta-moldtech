export async function smtpOutcome(
  send: () => Promise<{ accepted: unknown[] }>,
  recipient: string,
): Promise<"sent" | "failed" | "unknown"> {
  try {
    const result = await send();
    return result.accepted.map(String).includes(recipient) ? "sent" : "failed";
  } catch (error) {
    const e = error as { code?: string; responseCode?: number };
    return e.code === "EAUTH" ||
      e.code === "ECONNECTION" ||
      (e.responseCode !== undefined && e.responseCode >= 400)
      ? "failed"
      : "unknown";
  }
}

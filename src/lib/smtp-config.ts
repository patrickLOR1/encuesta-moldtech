export function smtpConfiguration(env: Record<string, string | undefined>) {
  const host = env.SMTP_HOST || "",
    port = Number(env.SMTP_PORT),
    secure = env.SMTP_SECURE === "true",
    user = env.SMTP_USER || "",
    from = env.SMTP_FROM || "",
    passwordPresent = Boolean(env.SMTP_APP_PASSWORD?.trim()),
    enabled = env.SMTP_ENABLED === "true";
  const valid =
    host === "smtp.gmail.com" &&
    port === 465 &&
    secure &&
    user === "jl.rangel@moldtech.mx" &&
    from === user &&
    passwordPresent;
  return {
    host,
    port: Number.isFinite(port) ? port : null,
    secure,
    user,
    from,
    passwordPresent,
    enabled,
    valid,
  };
}

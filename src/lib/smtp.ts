import nodemailer from "nodemailer";
import { database } from "./database";
import { invitationMessage } from "./invitation";
import { processInvitation } from "./invitation-worker";
import { smtpConfiguration } from "./smtp-config";
export async function deliverInvitations(meetingId?: string) {
  const config = smtpConfiguration(process.env);
  if (!config.enabled || !config.valid || config.port === null) return;
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port!,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: process.env.SMTP_APP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    logger: false,
    debug: false,
  });
  try {
    return await processInvitation(
      database(),
      (event) => transport.sendMail(invitationMessage(event, config.from)),
      meetingId,
    );
  } finally {
    transport.close();
  }
}

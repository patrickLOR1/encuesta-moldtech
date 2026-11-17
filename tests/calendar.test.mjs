import test from "node:test";
import assert from "node:assert/strict";
import { meetingInstant, meetingError } from "../src/lib/meeting-time.ts";
import { invitationMessage } from "../src/lib/invitation.ts";
import nodemailer from "nodemailer";
test("Mexico City instant is converted to UTC", () =>
  assert.equal(
    meetingInstant("2030-06-01", "10:00"),
    "2030-06-01T16:00:00.000Z",
  ));
test("invalid dates and missing time rejected", () => {
  assert.equal(meetingInstant("2030-02-30", "12:00"), null);
  assert.ok(meetingError({ meetingDate: "2030-06-01" }));
});
test("past dates rejected and pending dates optional", () => {
  assert.ok(meetingError({ meetingDate: "2000-01-01", meetingTime: "12:00" }));
  assert.equal(meetingError({}), "");
});
test("confirmation requires date and email", () => {
  assert.ok(meetingError({ meetingConfirmed: true }));
  assert.ok(
    meetingError({
      meetingDate: "2030-06-01",
      meetingTime: "10:00",
      meetingConfirmed: true,
    }),
  );
});
const event = {
  uid: "stable-id@moldtech.mx",
  sequence: 0,
  start: "2030-06-01T16:00:00Z",
  end: "2030-06-01T16:30:00Z",
  email: "fixture@example.invalid",
  company: "Empresa ficticia",
  method: "REQUEST",
};
test("ICS contains REQUEST and required interoperable fields", () => {
  const s = invitationMessage(event, "jl.rangel@moldtech.mx").icalEvent.content;
  for (const key of [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:",
    "METHOD:REQUEST",
    "UID:stable-id@moldtech.mx",
    "DTSTAMP:",
    "DTSTART:20300601T160000Z",
    "DTEND:20300601T163000Z",
    "ORGANIZER;",
    "ATTENDEE;",
    "SEQUENCE:0",
  ])
    assert.ok(s.includes(key), key);
});
test("cancel preserves UID and increments sequence", () => {
  const s = invitationMessage(
    { ...event, method: "CANCEL", sequence: 1 },
    "jl.rangel@moldtech.mx",
  ).icalEvent.content;
  assert.ok(s.includes("METHOD:CANCEL"));
  assert.ok(s.includes("STATUS:CANCELLED"));
  assert.ok(s.includes("SEQUENCE:1"));
  assert.ok(s.includes("UID:stable-id@moldtech.mx"));
});
test("MIME includes calendar part and attachment without network", async () => {
  const t = nodemailer.createTransport({ streamTransport: true, buffer: true });
  const result = await t.sendMail(
    invitationMessage(event, "jl.rangel@moldtech.mx"),
  );
  const mime = result.message.toString();
  assert.match(mime, /text\/calendar/);
  assert.match(mime, /application\/ics/);
  assert.match(mime, /method=REQUEST/i);
});

import { smtpOutcome } from "../src/lib/smtp-result.ts";
test("SMTP acceptance is distinct from delivery and rejection", async () => {
  assert.equal(
    await smtpOutcome(
      async () => ({ accepted: ["test@example.invalid"] }),
      "test@example.invalid",
    ),
    "sent",
  );
  assert.equal(
    await smtpOutcome(async () => ({ accepted: [] }), "test@example.invalid"),
    "failed",
  );
});
test("SMTP auth/rejection can retry; timeout and disconnect remain ambiguous", async () => {
  for (const code of ["EAUTH", "ECONNECTION"])
    assert.equal(
      await smtpOutcome(async () => {
        throw { code };
      }, "test@example.invalid"),
      "failed",
    );
  for (const code of ["ETIMEDOUT", "ESOCKET"])
    assert.equal(
      await smtpOutcome(async () => {
        throw { code };
      }, "test@example.invalid"),
      "unknown",
    );
});

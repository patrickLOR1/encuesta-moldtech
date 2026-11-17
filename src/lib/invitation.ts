import ical, { ICalCalendarMethod, ICalEventStatus } from "ical-generator";
export type Invitation = {
  uid: string;
  sequence: number;
  start: string;
  end: string;
  email: string;
  company: string;
  method: "REQUEST" | "CANCEL";
};
export function invitationMessage(event: Invitation, from: string) {
  const calendar = ical({
    prodId: { company: "MoldTech", product: "Leads", language: "ES" },
    method:
      event.method === "CANCEL"
        ? ICalCalendarMethod.CANCEL
        : ICalCalendarMethod.REQUEST,
  });
  const subject = `Demostración MoldTech — ${event.company}`;
  const description = `Reunión de seguimiento para conocer las necesidades de producción de ${event.company} y presentar las soluciones de MoldTech.`;
  calendar.createEvent({
    id: event.uid,
    sequence: event.sequence,
    start: new Date(event.start),
    end: new Date(event.end),
    stamp: new Date(),
    summary: subject,
    description,
    organizer: { name: "MoldTech", email: from },
    attendees: [{ email: event.email, rsvp: true }],
    status:
      event.method === "CANCEL"
        ? ICalEventStatus.CANCELLED
        : ICalEventStatus.CONFIRMED,
  });
  return {
    from,
    to: event.email,
    subject,
    text:
      event.method === "CANCEL" ? `Reunión cancelada: ${subject}` : description,
    messageId: `<${event.uid.split("@")[0]}.${event.sequence}@moldtech.mx>`,
    icalEvent: {
      method: event.method,
      filename: "moldtech.ics",
      content: calendar.toString(),
    },
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

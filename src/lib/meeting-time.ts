import { DateTime } from "luxon";
export const meetingZone = "America/Mexico_City";
export function meetingInstant(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return null;
  const dt = DateTime.fromISO(`${date}T${time}`, { zone: meetingZone });
  return dt.isValid && dt.toFormat("yyyy-MM-dd HH:mm") === `${date} ${time}`
    ? dt.toUTC().toISO()
    : null;
}
export function meetingError(
  v: {
    meetingDate?: string;
    meetingTime?: string;
    meetingDuration?: string;
    meetingConfirmed?: boolean;
    email?: string;
  },
  now = Date.now(),
) {
  if (!v.meetingDate && !v.meetingTime)
    return v.meetingConfirmed
      ? "Selecciona fecha y hora para confirmar la reunión."
      : "";
  const instant = meetingInstant(v.meetingDate || "", v.meetingTime || "");
  if (!instant) return "Selecciona una fecha y hora válidas.";
  if (new Date(instant).getTime() <= now)
    return "La reunión debe ser en el futuro.";
  if (!/^(15|30|45|60|90|120)$/.test(v.meetingDuration || "30"))
    return "Selecciona una duración válida.";
  if (v.meetingConfirmed && !v.email)
    return "La invitación necesita el correo del prospecto.";
  return "";
}

import { z } from "zod";
const text = z.string().trim().max(4000).default("");
export const leadSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    company: z.string().trim().min(1).max(200),
    role: text,
    phone: text.refine(
      (p) =>
        !p ||
        (/^[+\d\s().-]+$/.test(p) &&
          p.replace(/\D/g, "").length >= 10 &&
          p.replace(/\D/g, "").length <= 15),
      "Teléfono inválido",
    ),
    email: text.refine(
      (e) => !e || z.email().safeParse(e).success,
      "Correo inválido",
    ),
    location: text,
    machineCount: z
      .string()
      .default("")
      .refine(
        (n) => !n || (/^\d+$/.test(n) && Number(n) <= 2147483647),
        "Número de máquinas inválido",
      ),
    machineTypes: z
      .array(z.enum(["Inyectoras", "Extrusoras", "Sopladoras", "CNC", "Otras"]))
      .max(5)
      .default([]),
    machineTypesOther: text,
    monitoring: z.enum(["", "Sí", "No", "Parcialmente"]).default(""),
    productionLog: z
      .enum([
        "",
        "Registros manuales",
        "Excel",
        "Software especializado",
        "ERP/MES",
        "No monitorean",
        "Otro",
      ])
      .default(""),
    productionLogOther: text,
    problems: z
      .array(
        z.enum([
          "Tiempos muertos",
          "Conteo de ciclos",
          "Eficiencia de producción",
          "Merma",
          "Monitoreo en tiempo real",
          "Órdenes de producción",
          "Reportes",
          "Otro",
        ]),
      )
      .max(8)
      .default([]),
    problemsOther: text,
    moldtechInterest: text,
    demoInterest: z.enum(["", "Sí", "Tal vez", "No por ahora"]).default(""),
    meetingDate: text,
    meetingTime: text,
    meetingDuration: z
      .enum(["15", "30", "45", "60", "90", "120"])
      .default("30"),
    meetingConfirmed: z.boolean().default(false),
    consent: z.boolean().default(false),
  })
  .refine((v) => v.phone || v.email, "Ingresa al menos un medio de contacto");
export const trackingSchema = z.object({
  status: z
    .enum([
      "Nuevo",
      "Contactado",
      "Demostración pendiente",
      "Cotización enviada",
      "En negociación",
      "Cliente",
      "No interesado",
    ])
    .default("Nuevo"),
  interest: z.enum(["", "Alto", "Medio", "Bajo"]).default(""),
  nextAction: text,
  notes: text,
  nextContact: z
    .string()
    .default("")
    .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v)),
});
export const payloadSchema = z.object({
  id: z.uuid(),
  answers: leadSchema,
  tracking: trackingSchema,
});
export function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}

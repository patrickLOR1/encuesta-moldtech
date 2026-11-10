"use client";
import { meetingError } from "@/lib/meeting-time";
import { Availability } from "./availability";
import { useState } from "react";
import { leadSchema } from "@/lib/validation";
export const questions = [
  ["fullName", "Nombre completo"],
  ["company", "Empresa"],
  ["role", "Puesto"],
  ["phone", "Teléfono"],
  ["email", "Correo electrónico"],
  ["location", "Ubicación de la planta"],
  ["machineCount", "Número de máquinas"],
  ["machineTypes", "Tipo de máquinas que utilizan"],
  ["monitoring", "¿Actualmente cuentan con algún sistema de monitoreo?"],
  ["productionLog", "¿Cómo monitorean actualmente su producción?"],
  ["problems", "¿Qué problemas buscan resolver?"],
  ["moldtechInterest", "¿Qué les interesó más de MoldTech?"],
  ["meetingDate", "Fecha para la siguiente reunión"],
] as const;
const options: Record<string, string[]> = {
  machineTypes: ["Inyectoras", "Extrusoras", "Sopladoras", "CNC", "Otras"],
  monitoring: ["Sí", "No", "Parcialmente"],
  productionLog: [
    "Registros manuales",
    "Excel",
    "Software especializado",
    "ERP/MES",
    "No monitorean",
    "Otro",
  ],
  problems: [
    "Tiempos muertos",
    "Conteo de ciclos",
    "Eficiencia de producción",
    "Merma",
    "Monitoreo en tiempo real",
    "Órdenes de producción",
    "Reportes",
    "Otro",
  ],
  demoInterest: ["Sí", "Tal vez", "No por ahora"],
};
export type Answers = Record<string, string | string[] | boolean>;
export function answerText(a: Answers, key: string) {
  if (key === "meetingDate")
    return a.meetingDate
      ? `${a.meetingDate} ${a.meetingTime || ""} · ${a.meetingDuration || "30"} minutos · Ciudad de México`
      : "Pendiente de agendar";
  return Array.isArray(a[key])
    ? (a[key] as string[]).join(", ")
    : String(a[key] ?? "");
}
export function validate(v: Answers, initial: Answers = {}) {
  const result = leadSchema.safeParse(v);
  return result.success
    ? initial.meetingDate && ['meetingDate','meetingTime','meetingDuration','meetingConfirmed'].every(k=>v[k]===initial[k]) ? '' : meetingError(result.data)
    : result.error.issues[0].message;
}
export function ApprovedForm({
  initial = {},
  close,
  save,
}: {
  initial?: Answers;
  close: () => void;
  save: (v: Answers) => Promise<void>;
}) {
  const [v, set] = useState<Answers>({
      ...initial,
      consent: initial.consent === true,
    }),
    [step, S] = useState(0),
    [error, E] = useState(""),
    [busy, B] = useState(false);
  const change = (k: string, x: string | string[] | boolean) =>
    set((a) => ({ ...a, [k]: x }));
  return (
    <div className="overlay">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Captura de prospecto"
      >
        <div className="modalhead">
          <h2>Captura de prospecto</h2>
          <button
            className="btn ghost"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "¿Cerrar la captura? Las respuestas sin guardar se perderán.",
                )
              )
                close();
            }}
          >
            Cerrar
          </button>
        </div>
        <div className="body">
          <span className="muted">
            Sección {step + 1} de 3 · Nombre, empresa y un medio de contacto
            obligatorios
          </span>
          <h3>
            {
              [
                "Datos de contacto",
                "Información de la planta",
                "Necesidades del prospecto",
              ][step]
            }
          </h3>
          <div className="grid">
            {questions
              .slice(
                ...([
                  [0, 5],
                  [5, 9],
                  [9, 13],
                ][step] as [number, number]),
              )
              .map(([k, label], i) => {
                const multi = k === "machineTypes" || k === "problems";
                return (
                  <div className="control wide" key={k}>
                    <label htmlFor={k}>
                      {[0, 5, 9][step] + i + 1}. {label}
                    </label>
                    {k === "meetingDate" ? (
                      <div className="grid">
                        <label>
                          Fecha
                          <input
                            id={k}
                            className="field"
                            type="date"
                            value={String(v.meetingDate || "")}
                            onChange={(e) =>
                              change("meetingDate", e.target.value)
                            }
                          />
                        </label>
                        <label>
                          Hora · Ciudad de México
                          <input
                            className="field"
                            type="time"
                            value={String(v.meetingTime || "")}
                            onChange={(e) =>
                              change("meetingTime", e.target.value)
                            }
                          />
                        </label>
                        <label>
                          Duración
                          <select
                            className="field"
                            value={String(v.meetingDuration || "30")}
                            onChange={(e) =>
                              change("meetingDuration", e.target.value)
                            }
                          >
                            {["15", "30", "45", "60", "90", "120"].map((d) => (
                              <option key={d} value={d}>
                                {d} minutos
                              </option>
                            ))}
                          </select>
                        </label>
                        <p>Sin fecha: pendiente de agendar.</p>
                        <Availability
                          date={String(v.meetingDate || "")}
                          duration={String(v.meetingDuration || "30")}
                          choose={(time) => change("meetingTime", time)}
                        />
                        <label className="check wide">
                          <input
                            type="checkbox"
                            checked={v.meetingConfirmed === true}
                            onChange={(e) =>
                              change("meetingConfirmed", e.target.checked)
                            }
                          />
                          Confirmé con el visitante el horario y correo para
                          enviar la invitación.
                        </label>
                      </div>
                    ) : options[k] ? (
                      <div className="choices">
                        {options[k].map((o) => (
                          <button
                            type="button"
                            aria-pressed={
                              multi
                                ? ((v[k] as string[]) || []).includes(o)
                                : v[k] === o
                            }
                            className={`choice ${(multi ? ((v[k] as string[]) || []).includes(o) : v[k] === o) ? "on" : ""}`}
                            key={o}
                            onClick={() =>
                              change(
                                k,
                                multi
                                  ? ((v[k] as string[]) || []).includes(o)
                                    ? (v[k] as string[]).filter((x) => x !== o)
                                    : [...((v[k] as string[]) || []), o]
                                  : v[k] === o
                                    ? ""
                                    : o,
                              )
                            }
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    ) : k === "moldtechInterest" ? (
                      <textarea
                        id={k}
                        className="field"
                        value={String(v[k] || "")}
                        onChange={(e) => change(k, e.target.value)}
                      />
                    ) : (
                      <input
                        id={k}
                        className="field"
                        type={
                          k === "machineCount"
                            ? "number"
                            : k === "email"
                              ? "email"
                              : k === "phone"
                                ? "tel"
                                : "text"
                        }
                        min={0}
                        step={1}
                        value={String(v[k] || "")}
                        onChange={(e) => change(k, e.target.value)}
                      />
                    )}{" "}
                    {(multi
                      ? ((v[k] as string[]) || []).some(
                          (x) => x === "Otras" || x === "Otro",
                        )
                      : v[k] === "Otro") && (
                      <input
                        aria-label={`${label}: especificar otro`}
                        className="field"
                        placeholder="Especificar otro (opcional)"
                        value={String(v[k + "Other"] || "")}
                        onChange={(e) => change(k + "Other", e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
          </div>
          {step === 2 && (
            <aside className="notice" style={{ marginTop: 24 }}>
              <strong>Privacidad y comunicaciones</strong>
              <p>
                Aviso de privacidad pendiente de aprobación. Falta validar la
                identidad y domicilio del responsable, finalidades, derechos
                ARCO y contacto de privacidad antes de captar datos personales
                reales.
              </p>
              <label className="check">
                <input
                  type="checkbox"
                  checked={v.consent === true}
                  onChange={(e) => change("consent", e.target.checked)}
                />{" "}
                El visitante acepta recibir comunicaciones comerciales.
              </label>
            </aside>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </div>
        <div className="foot">
          <button
            className="btn ghost"
            disabled={!step}
            onClick={() => S(step - 1)}
          >
            Anterior
          </button>
          <button
            className="btn primary"
            disabled={busy}
            onClick={async () => {
              const err = validate(v, initial);
              E(err);
              if (err) return;
              if (step < 2) S(step + 1);
              else {
                B(true);
                try {
                  await save(v);
                } catch (e) {
                  E((e as Error).message || "No se guardó. Reintenta.");
                } finally {
                  B(false);
                }
              }
            }}
          >
            {busy ? "Guardando…" : step < 2 ? "Continuar" : "Guardar prospecto"}
          </button>
        </div>
      </div>
    </div>
  );
}

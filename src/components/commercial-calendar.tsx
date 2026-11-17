"use client";
import { useEffect, useState, useCallback } from "react";
import { Availability } from "./availability";
import { DateTime } from "luxon";
import { meetingZone } from "@/lib/meeting-time";
type Meeting = {
  id: string;
  prospecto_id: string;
  name: string;
  company: string;
  responsable: string;
  responsable_id: string;
  fecha_inicio_utc: string | null;
  fecha_fin_utc: string | null;
  estado: string;
  email_invitado: string | null;
  calendar_sequence: number;
  invitation_status: string;
};
const states: Record<string, string> = {
  pending: "Pendiente de agendar",
  scheduled: "Confirmada internamente",
  cancelled: "Cancelada",
  completed: "Realizada",
};
const invitations: Record<string, string> = {
  pending: "Pendiente de envío",
  sending: "En proceso",
  sent: "Aceptada por SMTP",
  failed: "Envío fallido",
  unknown: "Resultado desconocido: revisar",
  not_requested: "Sin invitación solicitada",
};
export function CommercialCalendar({
  openLead,
  now,
}: {
  now: number;
  openLead: (id: string) => void;
}) {
  const [rows, setRows] = useState<Meeting[]>([]),
    [error, setError] = useState(""),
    [view, setView] = useState<"month" | "week" | "day">("month"),
    [anchor, setAnchor] = useState(
      DateTime.fromMillis(now).setZone(meetingZone).toISODate()!,
    ),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState(""),
    [responsible, setResponsible] = useState(""),
    [selected, setSelected] = useState<Meeting | null>(null),
    [date, setDate] = useState(""),
    [time, setTime] = useState(""),
    [duration, setDuration] = useState("30"),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    const r = await fetch("/api/meetings");
    const result = await r.json();
    if (!r.ok) throw Error(result.error);
    setRows(result);
  }, []);
  useEffect(() => {
    fetch("/api/meetings")
      .then(async (r) => {
        const value = await r.json();
        if (!r.ok) throw Error(value.error);
        return value;
      })
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  const start = DateTime.fromISO(anchor, { zone: meetingZone }).startOf(view),
    end = start.plus({ [view + "s"]: 1 });
  const filtered = rows.filter(
    (m) =>
      (!status || m.estado === status) &&
      (!responsible || m.responsable === responsible) &&
      `${m.name} ${m.company}`.toLowerCase().includes(query.toLowerCase()),
  );
  const shown = filtered.filter(
    (m) =>
      !m.fecha_inicio_utc ||
      status === "cancelled" ||
      status === "completed" ||
      (DateTime.fromISO(m.fecha_inicio_utc) >= start &&
        DateTime.fromISO(m.fecha_inicio_utc) < end),
  );
  const choose = (m: Meeting) => {
    setSelected(m);
    const dt = m.fecha_inicio_utc
      ? DateTime.fromISO(m.fecha_inicio_utc).setZone(meetingZone)
      : null;
    setDate(dt?.toISODate() || "");
    setTime(dt?.toFormat("HH:mm") || "");
    setDuration(
      m.fecha_inicio_utc && m.fecha_fin_utc
        ? String(
            (Date.parse(m.fecha_fin_utc) - Date.parse(m.fecha_inicio_utc)) /
              60000,
          )
        : "30",
    );
    setConfirmed(false);
    setError("");
  };
  async function update(action: string) {
    if (!selected) return;
    if (
      action === "cancel" &&
      !window.confirm(
        "¿Cancelar esta reunión y preparar el aviso al prospecto?",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          sequence: selected.calendar_sequence,
          action,
          date,
          time,
          duration,
          confirmed,
        }),
      });
      const value = await r.json();
      if (!r.ok) throw Error(value.error);
      await reload();
      setSelected(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <div className="panelhead">
        <h2>Calendario</h2>
        <button
          className="btn ghost"
          onClick={() => reload().catch((e) => setError(e.message))}
        >
          Actualizar
        </button>
      </div>
      <div style={{ padding: 20 }}>
        <div className="stats">
          {[
            ["Pendientes", rows.filter((m) => m.estado === "pending").length],
            [
              "Confirmadas",
              rows.filter((m) => m.estado === "scheduled").length,
            ],
            [
              "Invitaciones SMTP",
              rows.filter((m) => m.invitation_status === "sent").length,
            ],
            [
              "Envíos fallidos",
              rows.filter((m) => m.invitation_status === "failed").length,
            ],
            ["Canceladas", rows.filter((m) => m.estado === "cancelled").length],
          ].map(([label, count]) => (
            <div className="stat" key={label}>
              <strong>{count}</strong>
              {label}
            </div>
          ))}
        </div>
        <p>
          Horarios de Ciudad de México. Disponibilidad del calendario interno;
          no consulta calendarios externos.
        </p>
        <div className="tools">
          <button
            className="btn ghost"
            aria-label="Periodo anterior"
            onClick={() =>
              setAnchor(start.minus({ [view + "s"]: 1 }).toISODate()!)
            }
          >
            ←
          </button>
          <input
            className="field"
            aria-label="Fecha del calendario"
            type="date"
            value={anchor}
            onChange={(e) => e.target.value && setAnchor(e.target.value)}
          />
          <button
            className="btn ghost"
            aria-label="Periodo siguiente"
            onClick={() =>
              setAnchor(start.plus({ [view + "s"]: 1 }).toISODate()!)
            }
          >
            →
          </button>
          {(["month", "week", "day"] as const).map((v, i) => (
            <button
              key={v}
              aria-pressed={view === v}
              className="btn ghost"
              onClick={() => setView(v)}
            >
              {["Mes", "Semana", "Día"][i]}
            </button>
          ))}
        </div>
        <div className="tools">
          <input
            className="field"
            aria-label="Buscar reuniones"
            placeholder="Buscar reuniones"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            className="field"
            aria-label="Estado de reunión"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            {Object.entries(states).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            className="field"
            aria-label="Responsable de reunión"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
          >
            <option value="">Todos los responsables</option>
            {Array.from(new Set(rows.map((m) => m.responsable))).map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </div>
        <p role="alert">{!selected && error}</p>
        <h3>
          {start.setLocale("es").toLocaleString(DateTime.DATE_FULL)} —{" "}
          {end
            .minus({ days: 1 })
            .setLocale("es")
            .toLocaleString(DateTime.DATE_FULL)}
        </h3>
        {view !== "day" && (
          <div
            className="calendar-days"
            aria-label={view === "month" ? "Vista mensual" : "Vista semanal"}
          >
            {Array.from(
              { length: Math.round(end.diff(start, "days").days) },
              (_, i) => start.plus({ days: i }),
            ).map((day) => (
              <button
                className="calendar-day"
                key={day.toISODate()}
                onClick={() => {
                  setAnchor(day.toISODate()!);
                  setView("day");
                }}
              >
                <strong>{day.setLocale("es").toFormat("ccc dd")}</strong>
                <span>
                  {
                    filtered.filter(
                      (m) =>
                        m.fecha_inicio_utc &&
                        DateTime.fromISO(m.fecha_inicio_utc)
                          .setZone(meetingZone)
                          .hasSame(day, "day"),
                    ).length
                  }{" "}
                  reuniones
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="calendar-list">
          {shown.map((m) => (
            <button
              className="calendar-card"
              key={m.id}
              onClick={() => choose(m)}
            >
              <strong>
                {m.company} · {m.name}
              </strong>
              <span>
                {m.fecha_inicio_utc
                  ? DateTime.fromISO(m.fecha_inicio_utc)
                      .setZone(meetingZone)
                      .setLocale("es")
                      .toFormat("ccc dd LLL, HH:mm")
                  : "Sin fecha acordada"}
              </span>
              <span>
                {states[m.estado]} · {invitations[m.invitation_status]}
              </span>
              <small>{m.responsable}</small>
            </button>
          ))}
        </div>
        {!shown.length && (
          <p className="empty">No hay reuniones para este periodo y filtros.</p>
        )}
        <h3>Próximas reuniones</h3>
        {rows
          .filter(
            (m) =>
              m.estado === "scheduled" && Date.parse(m.fecha_inicio_utc!) > now,
          )
          .slice(0, 5)
          .map((m) => (
            <button className="btn ghost" key={m.id} onClick={() => choose(m)}>
              {m.company} ·{" "}
              {DateTime.fromISO(m.fecha_inicio_utc!)
                .setZone(meetingZone)
                .toFormat("dd/MM HH:mm")}
            </button>
          ))}
      </div>
      {selected && (
        <div className="overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Detalle de reunión"
          >
            <div className="modalhead">
              <h2>{selected.company}</h2>
              <button
                className="btn ghost"
                disabled={busy}
                onClick={() => setSelected(null)}
              >
                Cerrar
              </button>
            </div>
            <div className="body">
              <p>
                {selected.name} · {selected.email_invitado || "Sin correo"}
              </p>
              <p>{selected.responsable}</p>
              <p>
                {states[selected.estado]} ·{" "}
                {invitations[selected.invitation_status]}
              </p>
              <p>
                La aceptación del servidor SMTP no confirma entrega ni
                aceptación del invitado.
              </p>
              <button
                className="btn ghost"
                onClick={() => {
                  setSelected(null);
                  openLead(selected.prospecto_id);
                }}
              >
                Ver ficha del prospecto
              </button>
              {["pending", "scheduled"].includes(selected.estado) && (
                <>
                  <label>
                    Fecha
                    <input
                      className="field"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                  <label>
                    Hora
                    <input
                      className="field"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </label>
                  <label>
                    Duración
                    <select
                      className="field"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    >
                      {["15", "30", "45", "60", "90", "120"].map((v) => (
                        <option key={v} value={v}>
                          {v} minutos
                        </option>
                      ))}
                    </select>
                  </label>
                  <Availability
                    date={date}
                    duration={duration}
                    responsible={selected.responsable_id}
                    exclude={selected.id}
                    choose={setTime}
                  />
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    Confirmé el nuevo horario y correo con el visitante.
                  </label>
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() => update("reschedule")}
                  >
                    Guardar horario
                  </button>
                  {selected.estado === "scheduled" && (
                    <>
                      <button
                        className="btn ghost"
                        disabled={busy}
                        onClick={() => update("cancel")}
                      >
                        Cancelar reunión
                      </button>
                      <button
                        className="btn ghost"
                        disabled={busy}
                        onClick={() => update("complete")}
                      >
                        Marcar realizada
                      </button>
                    </>
                  )}
                </>
              )}
              {["failed", "pending"].includes(selected.invitation_status) && (
                <button
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => update("retry")}
                >
                  Reintentar invitación
                </button>
              )}
              <p role="alert">{error}</p>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

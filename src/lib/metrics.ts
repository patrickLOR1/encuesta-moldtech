type Row = {
  deleted_at?: string | null;
  created_at: string;
  answers: { demoInterest?: unknown };
  tracking: { interest?: string; status: string };
};
export function commercialMetrics(rows: Row[], now = new Date()) {
  const active = rows.filter((row) => !row.deleted_at);
  const date = (value: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(value);
  return {
    total: active.length,
    high: active.filter((r) => r.tracking.interest === "Alto").length,
    demos: active.filter(
      (r) =>
        r.tracking.status === "Demostración pendiente" ||
        (r.answers.demoInterest === "Sí" && r.tracking.status === "Nuevo"),
    ).length,
    contact: active.filter((r) => r.tracking.status === "Nuevo").length,
    today: active.filter((r) => date(new Date(r.created_at)) === date(now))
      .length,
  };
}

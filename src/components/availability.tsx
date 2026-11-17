"use client";
import { useEffect, useState } from "react";
export function Availability({
  date,
  duration,
  responsible,
  exclude,
  choose,
}: {
  date: string;
  duration: string;
  responsible?: string;
  exclude?: string;
  choose: (time: string) => void;
}) {
  const [slots, setSlots] = useState<{ time: string }[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    const q = new URLSearchParams({
      date,
      duration,
      ...(responsible ? { responsible } : {}),
      ...(exclude ? { exclude } : {}),
    });
    fetch("/api/meetings/availability?" + q, { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw Error(data.error);
        return data;
      })
      .then((data) => {
        setSlots(data);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [date, duration, responsible, exclude]);
  if (!date) return null;
  return (
    <aside className="wide">
      <p>
        Alternativas del calendario interno (09:00–18:00). Se vuelven a validar
        al guardar.
      </p>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <div className="choices">
          {slots.slice(0, 12).map((s) => (
            <button
              type="button"
              className="choice"
              key={s.time}
              onClick={() => choose(s.time)}
            >
              {s.time}
            </button>
          ))}
          {!slots.length && (
            <span>No hay alternativas disponibles en ese horario.</span>
          )}
        </div>
      )}
    </aside>
  );
}

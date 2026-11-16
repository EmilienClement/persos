"use client";
import { useEffect, useState } from "react";
import { useLocation } from "@/lib/useLocation";
import type { Weather } from "@/lib/weather";

export default function WeatherCard() {
  const { place, byGeolocation, byCity } = useLocation();
  const [w, setW] = useState<Weather | null>(null);
  const [err, setErr] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setErr(false);
    fetch(`/api/weather?lat=${place.lat}&lon=${place.lon}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setW)
      .catch(() => setErr(true));
  }, [place.lat, place.lon]);

  return (
    <section className="weather">
      <div className="row">
        <strong>{place.city}</strong>
        <button className="link" onClick={() => setEditing(!editing)}>changer</button>
      </div>
      {w ? (
        <>
          <p className="big">{w.now.feels}° <span className="muted">ressenti · {w.now.label}</span></p>
          <p className="muted small">
            Journée : {w.day.feelsMin}° à {w.day.feelsMax}° · pluie jusqu’à {w.day.rainMax} % · vent {w.now.wind} km/h
          </p>
        </>
      ) : (
        <p className="muted">{err ? "Météo indisponible." : "…"}</p>
      )}
      {editing && (
        <form
          className="inline"
          onSubmit={async (e) => {
            e.preventDefault();
            const v = String(new FormData(e.currentTarget).get("city") ?? "").trim();
            if (v && (await byCity(v))) setEditing(false);
          }}
        >
          <input name="city" placeholder="Ville" />
          <button className="btn ghost">OK</button>
          <button type="button" className="btn ghost" onClick={async () => (await byGeolocation()) && setEditing(false)}>
            Ma position
          </button>
        </form>
      )}
      <p className="muted tiny">Météo : Open-Meteo.com</p>
    </section>
  );
}

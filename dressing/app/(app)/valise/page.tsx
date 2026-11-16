"use client";

import { useState } from "react";
import { useSignedUrls } from "@/lib/useSigned";

type Piece = { id: string; name: string; category: string; thumb_path: string | null };
type Result = {
  forecast: { date: string; feelsMin: number; feelsMax: number; rain: number }[];
  notes: string; combos: number; pieces: Piece[]; manque: { description: string; why: string }[];
};

const plusDays = (n: number) => new Date(Date.now() + n * 86400_000).toISOString().slice(0, 10);

export default function Valise() {
  const [dest, setDest] = useState("");
  const [start, setStart] = useState(plusDays(7));
  const [nights, setNights] = useState(4);
  const [purpose, setPurpose] = useState("mixte");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const urls = useSignedUrls(res?.pieces.map((p) => p.thumb_path) ?? []);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setRes(null);
    try {
      const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(dest)}&count=1&language=fr`).then((r) => r.json());
      const hit = g?.results?.[0];
      if (!hit) throw new Error("Destination introuvable.");
      const r = await fetch("/api/packing", {
        method: "POST",
        body: JSON.stringify({ dest: `${hit.name}${hit.country ? ", " + hit.country : ""}`, lat: hit.latitude, lon: hit.longitude, start, nights, purpose }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Erreur.");
      setRes(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erreur.");
    }
    setBusy(false);
  }

  const groups = res ? Object.entries(res.pieces.reduce<Record<string, Piece[]>>((a, p) => ((a[p.category] ??= []).push(p), a), {})) : [];

  return (
    <>
      <p className="eyebrow">Valise</p>
      <h1>Où vas-tu ?</h1>
      <form className="form" onSubmit={go}>
        <label>Destination<input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Lisbonne" required /></label>
        <label>Départ<input type="date" value={start} min={plusDays(0)} onChange={(e) => setStart(e.target.value)} required /></label>
        <label>Nuits<input type="number" min={1} max={30} value={nights} onChange={(e) => setNights(Number(e.target.value))} required /></label>
        <label>Motif
          <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="loisirs">Loisirs</option><option value="pro">Pro</option><option value="mixte">Mixte</option>
          </select>
        </label>
        <button className="btn" disabled={busy}>{busy ? "Je prépare…" : "Préparer la valise"}</button>
      </form>
      {err && <p role="alert" className="warn">{err}</p>}

      {res && (
        <>
          {res.forecast.length > 0 && (
            <p className="muted small">
              Prévisions : {Math.min(...res.forecast.map((d) => d.feelsMin))}° à {Math.max(...res.forecast.map((d) => d.feelsMax))}° ressenti,
              pluie jusqu’à {Math.max(...res.forecast.map((d) => d.rain))} %.
            </p>
          )}
          {res.forecast.length === 0 && <p className="muted small">Départ trop lointain pour des prévisions fiables (16 jours max).</p>}
          <p>{res.notes}</p>
          <p className="muted small">{res.pieces.length} pièces{res.combos ? ` · jusqu’à ${res.combos} combinaisons haut + bas` : ""}</p>
          {groups.map(([cat, ps]) => (
            <section key={cat}>
              <p className="eyebrow">{cat}</p>
              <div className="strip">
                {ps.map((p) => <figure key={p.id}>{urls[p.thumb_path ?? ""] ? <img src={urls[p.thumb_path!]} alt={p.name} /> : <div className="ph" />}<figcaption>{p.name}</figcaption></figure>)}
              </div>
            </section>
          ))}
          {res.manque.length > 0 && (
            <section className="manque"><p className="eyebrow">Il te manquerait</p>
              <ul>{res.manque.map((m, i) => <li key={i}><strong>{m.description}</strong> <span className="muted">{m.why}</span></li>)}</ul>
            </section>
          )}
        </>
      )}
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ShopLink } from "@/lib/shops";

type Sug = {
  id: string; status: string;
  payload: { source: string; title?: string; why?: string; description?: string; unlocked?: number; price_min?: number | null; price_max?: number | null; priority?: number; links?: ShopLink[] };
};

export default function Achats() {
  const supabase = useState(() => createClient())[0];
  const [rows, setRows] = useState<Sug[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("purchase_suggestions").select("id,status,payload").eq("status", "ouverte").order("created_at", { ascending: false });
    setRows((data ?? []) as Sug[]);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function analyze() {
    setBusy(true); setErr("");
    const r = await fetch("/api/purchases", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErr(j.error ?? "Erreur."); else await load();
    setBusy(false);
  }
  async function setStatus(id: string, status: "achetee" | "ignoree") {
    await supabase.from("purchase_suggestions").update({ status }).eq("id", id);
    setRows((l) => l!.filter((r) => r.id !== id));
  }

  const ia = (rows ?? []).filter((r) => r.payload.source === "ia").sort((a, b) => (b.payload.priority ?? 0) - (a.payload.priority ?? 0));
  const signaled = (rows ?? []).filter((r) => r.payload.source !== "ia");

  return (
    <>
      <p className="eyebrow">Proposition d’achat</p>
      <h1>Ce qui te manque</h1>
      <p className="muted">Analyse de ton dressing, de tes occasions et de tes goûts. Liens de recherche seulement : aucun prix n’est garanti.</p>
      <button className="btn" onClick={analyze} disabled={busy}>{busy ? "J’analyse…" : "Analyser mes manques"}</button>
      {err && <p role="alert" className="warn">{err}</p>}

      {ia.map((r) => (
        <article key={r.id} className="outfit">
          <h2>{r.payload.title}</h2>
          <p>{r.payload.why}</p>
          <p className="muted small">
            {r.payload.unlocked ? `${r.payload.unlocked} pièces de ton dressing s’y accordent` : ""}
            {r.payload.price_max ? ` · ${r.payload.price_min ?? 0} à ${r.payload.price_max} €` : ""}
          </p>
          <div className="links">{r.payload.links?.map((l) => <a key={l.label} href={l.url} target="_blank" rel="noreferrer noopener">{l.label} ↗</a>)}</div>
          <div className="actions">
            <button className="btn ghost" onClick={() => setStatus(r.id, "achetee")}>Acheté</button>
            <button className="btn ghost" onClick={() => setStatus(r.id, "ignoree")}>Pas pour moi</button>
          </div>
        </article>
      ))}

      {signaled.length > 0 && (
        <section className="manque">
          <p className="eyebrow">Signalés par le styliste</p>
          <ul>{signaled.map((r) => (
            <li key={r.id}><strong>{r.payload.description}</strong> <span className="muted">{r.payload.why}</span>{" "}
              <button className="link" onClick={() => setStatus(r.id, "ignoree")}>ignorer</button></li>
          ))}</ul>
        </section>
      )}
      {rows && ia.length === 0 && signaled.length === 0 && <p className="muted">Aucune proposition pour l’instant.</p>}
    </>
  );
}

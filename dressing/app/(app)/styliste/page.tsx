"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSignedUrls } from "@/lib/useSigned";
import { useLocation } from "@/lib/useLocation";
import { OCCASIONS } from "@/lib/occasions";
import { shuffleOutfit } from "@/lib/shuffle";

type OItem = { id: string; name: string; category: string; thumb_path: string | null };
type Outfit = { id: string; title: string; accords: string; weather_note: string | null; formality: number; items: OItem[] };
type Result = { outfits: Outfit[]; manque: { description: string; why: string }[]; message: string | null; error?: string };

export default function Styliste() {
  const supabase = useState(() => createClient())[0];
  const { place } = useLocation();
  const [occasion, setOccasion] = useState("ville");
  const [text, setText] = useState("");
  const [imposed, setImposed] = useState("");
  const [items, setItems] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    supabase.from("items").select("id,name").eq("status", "actif").order("name").then(({ data }) => setItems(data ?? []));
  }, [supabase]);

  const urls = useSignedUrls(res?.outfits.flatMap((o) => o.items.map((i) => i.thumb_path)) ?? []);

  async function go() {
    setBusy(true); setErr(""); setRes(null);
    const r = await fetch("/api/stylist", {
      method: "POST",
      body: JSON.stringify({ occasion, text: text || undefined, imposedItemId: imposed || undefined, lat: place.lat, lon: place.lon }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setErr(j.error ?? "Erreur."); else setRes(j);
    setBusy(false);
  }

  return (
    <>
      <p className="eyebrow">Styliste</p>
      <h1>Qu’est-ce qu’on porte ?</h1>

      <div className="chips" role="radiogroup" aria-label="Occasion">
        {OCCASIONS.map((o) => (
          <button key={o.id} role="radio" aria-checked={occasion === o.id} className={occasion === o.id ? "chip on" : "chip"} onClick={() => setOccasion(o.id)}>
            {o.label}
          </button>
        ))}
      </div>

      {occasion === "libre" && (
        <div className="form"><label>Décris l’occasion<input value={text} onChange={(e) => setText(e.target.value)} placeholder="ex. dîner chez des amis, il pleut" /></label></div>
      )}
      <div className="form">
        <label>Pièce imposée (optionnel)
          <select value={imposed} onChange={(e) => setImposed(e.target.value)}>
            <option value="">—</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
      </div>

      <button className="btn" onClick={go} disabled={busy}>{busy ? "Je réfléchis…" : "Proposer 3 tenues"}</button>
      <button className="btn ghost" onClick={async () => {
        setBusy(true); setErr(""); setRes(null);
        const o = await shuffleOutfit(supabase, true);
        if (o) setRes({ outfits: [o], manque: [], message: null }); else setErr("Pas assez de pièces disponibles (haut, bas, chaussures).");
        setBusy(false);
      }}>Au hasard (sans IA)</button>
      {err && <p role="alert" className="warn">{err}</p>}
      {res?.message && <p className="muted">{res.message}</p>}

      {res?.outfits.map((o) => <OutfitCard key={o.id} o={o} urls={urls} />)}

      {res && res.manque.length > 0 && (
        <section className="manque">
          <p className="eyebrow">Il te manque</p>
          <ul>{res.manque.map((m, i) => <li key={i}><strong>{m.description}</strong> <span className="muted">{m.why}</span></li>)}</ul>
          <p className="muted small">Gardé pour la future « Proposition d’achat ».</p>
        </section>
      )}
    </>
  );
}

function OutfitCard({ o, urls }: { o: Outfit; urls: Record<string, string> }) {
  const supabase = useState(() => createClient())[0];
  const [vote, setVote] = useState<0 | 1 | -1>(0);
  const [asking, setAsking] = useState<1 | -1 | null>(null);
  const [reason, setReason] = useState("");
  const [worn, setWorn] = useState(false);
  const [note, setNote] = useState("");
  const [plan, setPlan] = useState("");

  async function send(rating: 1 | -1, why?: string) {
    setVote(rating); setAsking(null);
    await fetch("/api/feedback", { method: "POST", body: JSON.stringify({ outfitId: o.id, rating, reason: why || undefined }) });
  }

  async function wear() {
    const rows = o.items.map((i) => ({ item_id: i.id, outfit_id: o.id }));
    const { error } = await supabase.from("wears").upsert(rows, { onConflict: "item_id,worn_on", ignoreDuplicates: true });
    if (error) return setNote("Erreur, réessaie.");
    await supabase.from("outfits").update({ status: "portee" }).eq("id", o.id);
    setWorn(true);
    setNote("Notée. Ces pièces ne seront plus proposées pendant 7 jours.");
  }

  return (
    <article className="outfit">
      <h2>{o.title}</h2>
      <div className="strip">
        {o.items.map((i) => (
          <figure key={i.id}>
            {urls[i.thumb_path ?? ""] ? <img src={urls[i.thumb_path!]} alt={i.name} /> : <div className="ph" />}
            <figcaption>{i.name}</figcaption>
          </figure>
        ))}
      </div>
      <p>{o.accords}</p>
      {o.weather_note && <p className="muted small">{o.weather_note}</p>}

      <div className="actions">
        <button className={vote === 1 ? "vote on" : "vote"} aria-label="J’aime" onClick={() => setAsking(1)}>👍</button>
        <button className={vote === -1 ? "vote on" : "vote"} aria-label="Je n’aime pas" onClick={() => setAsking(-1)}>👎</button>
        <button className="btn" disabled={worn} onClick={wear}>{worn ? "Portée" : "Je la porte"}</button>
      </div>
      {asking && (
        <form className="inline" onSubmit={(e) => { e.preventDefault(); send(asking, reason); }}>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Pourquoi ? (facultatif)" />
          <button className="btn ghost">Envoyer</button>
        </form>
      )}
      <form className="inline" onSubmit={async (e) => {
        e.preventDefault();
        if (!plan) return;
        await supabase.from("outfits").update({ status: "planifiee", planned_for: plan }).eq("id", o.id);
        setNote(`Planifiée pour le ${new Date(plan + "T12:00:00").toLocaleDateString("fr-FR")}.`);
      }}>
        <input type="date" value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Date" />
        <button className="btn ghost">Planifier</button>
      </form>
      {note && <p className="muted small" role="status">{note}</p>}
    </article>
  );
}

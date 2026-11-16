"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSignedUrls } from "@/lib/useSigned";

type Planned = { id: string; title: string | null; occasion: string; planned_for: string; items: { id: string; name: string; thumb_path: string | null }[] };
type Day = { worn_on: string; items: { name: string }[] };

const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export default function Calendrier() {
  const supabase = useState(() => createClient())[0];
  const [planned, setPlanned] = useState<Planned[]>([]);
  const [history, setHistory] = useState<Day[]>([]);

  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data: o } = await supabase.from("outfits")
      .select("id,title,occasion,planned_for,outfit_items(items(id,name,thumb_path))")
      .eq("status", "planifiee").gte("planned_for", today).order("planned_for");
    setPlanned((o ?? []).map((x) => ({ ...x, items: (x.outfit_items as unknown as { items: Planned["items"][number] }[]).map((oi) => oi.items) })) as Planned[]);

    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const { data: w } = await supabase.from("wears").select("worn_on,items(name)").gte("worn_on", since).order("worn_on", { ascending: false });
    const byDay = new Map<string, { name: string }[]>();
    (w ?? []).forEach((r) => byDay.set(r.worn_on, [...(byDay.get(r.worn_on) ?? []), ...[(r.items as unknown as { name: string })]]));
    setHistory([...byDay].map(([worn_on, items]) => ({ worn_on, items })));
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const urls = useSignedUrls(planned.flatMap((p) => p.items.map((i) => i.thumb_path)));

  async function markWorn(p: Planned) {
    await supabase.from("wears").upsert(p.items.map((i) => ({ item_id: i.id, outfit_id: p.id, worn_on: p.planned_for })), { onConflict: "item_id,worn_on", ignoreDuplicates: true });
    await supabase.from("outfits").update({ status: "portee" }).eq("id", p.id);
    load();
  }
  async function unplan(p: Planned) {
    await supabase.from("outfits").update({ status: "proposee", planned_for: null }).eq("id", p.id);
    load();
  }

  return (
    <>
      <p className="eyebrow">Calendrier</p>
      <h1>Tenues planifiées</h1>
      {planned.length === 0 && <p className="muted">Rien de prévu. Depuis le styliste, utilise « Planifier » sur une tenue.</p>}
      {planned.map((p) => (
        <article key={p.id} className="outfit">
          <p className="eyebrow">{fmt(p.planned_for)} · {p.occasion}</p>
          <h2>{p.title ?? "Tenue"}</h2>
          <div className="strip">
            {p.items.map((i) => (
              <figure key={i.id}>{urls[i.thumb_path ?? ""] ? <img src={urls[i.thumb_path!]} alt={i.name} /> : <div className="ph" />}<figcaption>{i.name}</figcaption></figure>
            ))}
          </div>
          <div className="actions">
            <button className="btn" onClick={() => markWorn(p)}>Portée</button>
            <button className="btn ghost" onClick={() => unplan(p)}>Retirer</button>
          </div>
        </article>
      ))}

      <h2 style={{ marginTop: 32 }}>Historique (30 jours)</h2>
      {history.length === 0 && <p className="muted">Aucun port enregistré.</p>}
      <ul className="rules">
        {history.map((d) => <li key={d.worn_on}><span>{fmt(d.worn_on)}</span><span className="muted small">{d.items.map((i) => i.name).join(", ")}</span></li>)}
      </ul>
    </>
  );
}

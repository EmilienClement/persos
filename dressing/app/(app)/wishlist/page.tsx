"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type W = { id: string; title: string; url: string | null; image_url: string | null; price: number | null; note: string | null; status: "souhaitee" | "achetee" };

export default function Wishlist() {
  const supabase = useState(() => createClient())[0];
  const [rows, setRows] = useState<W[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [f, setF] = useState({ url: "", title: "", price: "", note: "", image_url: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("wishlist").select("*").order("created_at", { ascending: false });
    if (error?.code === "42P01" || error?.code === "PGRST205") return setMissing(true);
    setRows((data ?? []) as W[]);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  async function importLink() {
    if (!f.url) return;
    setBusy(true); setMsg("");
    const r = await fetch("/api/link", { method: "POST", body: JSON.stringify({ url: f.url }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(j.error ?? "Erreur.");
    else setF((x) => ({ ...x, url: j.url ?? x.url, title: j.title ?? x.title, price: j.price ? String(j.price) : x.price, image_url: j.image ?? x.image_url }));
    setBusy(false);
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const price = f.price ? Number(f.price.replace(",", ".")) : null;
    const { error } = await supabase.from("wishlist").insert({ title: f.title, url: f.url || null, image_url: f.image_url || null, price: Number.isFinite(price) ? price : null, note: f.note || null });
    if (error) return setMsg("Erreur d’enregistrement.");
    setF({ url: "", title: "", price: "", note: "", image_url: "" });
    load();
  }
  async function patch(id: string, status: W["status"]) { await supabase.from("wishlist").update({ status }).eq("id", id); load(); }
  async function del(id: string) { await supabase.from("wishlist").delete().eq("id", id); load(); }

  if (missing) return (
    <>
      <p className="eyebrow">Wishlist</p><h1>Une étape manque</h1>
      <p className="muted">La table n’existe pas encore. Dans Supabase → SQL Editor, exécute le fichier <code>supabase/migrations/002_wishlist.sql</code>, puis recharge.</p>
    </>
  );

  return (
    <>
      <p className="eyebrow">Wishlist</p>
      <h1>Mes envies</h1>
      <form className="form" onSubmit={add}>
        <label>Lien produit (optionnel)
          <input type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://…" />
        </label>
        <button type="button" className="btn ghost" onClick={importLink} disabled={busy || !f.url}>{busy ? "Lecture…" : "Importer depuis le lien"}</button>
        <label>Titre<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></label>
        <label>Prix (€)<input inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></label>
        <label>Note<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="ex. avec mon pantalon marine" /></label>
        <button className="btn">Ajouter</button>
      </form>
      {msg && <p role="alert" className="warn">{msg}</p>}

      <ul className="wish">
        {(rows ?? []).map((w) => (
          <li key={w.id} className={w.status === "achetee" ? "done" : ""}>
            {w.image_url && <img src={w.image_url} alt="" referrerPolicy="no-referrer" loading="lazy" />}
            <div>
              <strong>{w.title}</strong>
              <span className="muted small">{[w.price != null && `${w.price} €`, w.note].filter(Boolean).join(" · ")}</span>
              <span className="links">
                {w.url && <a href={w.url} target="_blank" rel="noreferrer noopener">Ouvrir ↗</a>}
                {w.status === "souhaitee" ? <button className="link" onClick={() => patch(w.id, "achetee")}>acheté</button> : <button className="link" onClick={() => patch(w.id, "souhaitee")}>remettre</button>}
                <button className="link" onClick={() => del(w.id)}>supprimer</button>
              </span>
            </div>
          </li>
        ))}
      </ul>
      {rows?.length === 0 && <p className="muted">Rien pour l’instant.</p>}
    </>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSignedUrls } from "@/lib/useSigned";
import { CATEGORIES, COLORS, STYLES, SEASONS, type Item } from "@/lib/wardrobe";

const COLS = "id,name,category,colors,seasons,styles,formality,brand,thumb_path,wear_count";
type Row = Pick<Item, "id" | "name" | "category" | "colors" | "seasons" | "styles" | "formality" | "brand" | "thumb_path" | "wear_count">;

export default function Dressing() {
  const supabase = useState(() => createClient())[0];
  const [items, setItems] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [f, setF] = useState({ category: "", color: "", style: "", season: "", formality: "" });

  useEffect(() => {
    supabase.from("items").select(COLS).eq("status", "actif").order("created_at", { ascending: false })
      .then(({ data }) => setItems((data ?? []) as Row[]));
  }, [supabase]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (items ?? []).filter((i) =>
      (!f.category || i.category === f.category) &&
      (!f.color || i.colors.includes(f.color)) &&
      (!f.style || i.styles.includes(f.style)) &&
      (!f.season || i.seasons.includes(f.season)) &&
      (!f.formality || i.formality === Number(f.formality)) &&
      (!needle || `${i.name} ${i.brand ?? ""} ${i.category}`.toLowerCase().includes(needle)),
    );
  }, [items, q, f]);

  const urls = useSignedUrls(shown.map((i) => i.thumb_path));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <>
      <p className="eyebrow">Dressing</p>
      <h1>{items ? `${shown.length} pièce${shown.length > 1 ? "s" : ""}` : "…"}</h1>
      <input className="search" type="search" placeholder="Rechercher (nom, marque…)" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="filters">
        <select value={f.category} onChange={set("category")} aria-label="Catégorie"><option value="">Catégorie</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={f.color} onChange={set("color")} aria-label="Couleur"><option value="">Couleur</option>{COLORS.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={f.style} onChange={set("style")} aria-label="Style"><option value="">Style</option>{STYLES.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={f.season} onChange={set("season")} aria-label="Saison"><option value="">Saison</option>{SEASONS.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={f.formality} onChange={set("formality")} aria-label="Formalité"><option value="">Formalité</option>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
      </div>

      {items?.length === 0 && <p className="muted">Rien ici pour l’instant. <Link href="/import">Importe des photos</Link>.</p>}
      <div className="grid">
        {shown.map((i) => (
          <Link key={i.id} href={`/dressing/${i.id}`} className="tile">
            {urls[i.thumb_path ?? ""] ? <img src={urls[i.thumb_path!]} alt={i.name} loading="lazy" /> : <div className="ph" />}
            <span>{i.name}</span>
          </Link>
        ))}
      </div>
    </>
  );
}

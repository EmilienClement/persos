"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSignedUrls } from "@/lib/useSigned";
import { CATEGORIES, type Item } from "@/lib/wardrobe";

const COLS = "id,name,category,colors,material,formality,styles,brand,image_path,thumb_path,confidence";
type Row = Pick<Item, "id" | "name" | "category" | "colors" | "material" | "formality" | "styles" | "brand" | "image_path" | "thumb_path" | "confidence">;

export default function Valider() {
  const supabase = useState(() => createClient())[0];
  const [items, setItems] = useState<Row[] | null>(null);
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    supabase.from("items").select(COLS).eq("status", "a_valider").not("confidence", "is", null)
      .order("created_at").then(({ data }) => setItems((data ?? []) as Row[]));
  }, [supabase]);

  const current = items?.[0];
  const urls = useSignedUrls([current?.image_path]);

  async function save(patch: Record<string, unknown>) {
    if (!current) return;
    await supabase.from("items").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", current.id);
  }
  async function validate() {
    if (!current) return;
    await save({ status: "actif" });
    setItems((l) => l!.slice(1));
    setEdit(false);
  }
  async function remove() {
    if (!current || !confirm("Supprimer cette pièce ?")) return;
    await supabase.storage.from("wardrobe").remove([current.image_path!, current.thumb_path!].filter(Boolean));
    await supabase.from("items").delete().eq("id", current.id);
    setItems((l) => l!.slice(1));
    setEdit(false);
  }
  async function validateConfident() {
    const ids = items!.filter((i) => (i.confidence ?? 0) >= 0.8).map((i) => i.id);
    if (!ids.length || !confirm(`Valider ${ids.length} pièces sûres d’un coup ?`)) return;
    await supabase.from("items").update({ status: "actif" }).in("id", ids);
    setItems((l) => l!.filter((i) => !ids.includes(i.id)));
  }

  if (!items) return <p className="muted">Chargement…</p>;
  if (!current) {
    return (
      <>
        <p className="eyebrow">Validation</p>
        <h1>Tout est validé.</h1>
        <Link href="/dressing" className="btn">Voir le dressing →</Link>
      </>
    );
  }

  const confident = items.filter((i) => (i.confidence ?? 0) >= 0.8).length;

  return (
    <>
      <p className="eyebrow">Validation · {items.length} restante{items.length > 1 ? "s" : ""}</p>
      <div className="photo">{urls[current.image_path ?? ""] && <img src={urls[current.image_path!]} alt={current.name} />}</div>

      {!edit ? (
        <>
          <h2>{current.name}</h2>
          <p className="muted">
            {[current.category, current.colors.join(" / "), current.material, current.formality && `formalité ${current.formality}`]
              .filter(Boolean).join(" · ")}
          </p>
          {(current.confidence ?? 1) < 0.6 && <p className="warn">Je ne suis pas sûr de moi sur celle-ci.</p>}
          <button className="btn" onClick={validate}>Valider</button>
          <button className="btn ghost" onClick={() => setEdit(true)}>Corriger</button>
          {confident > 1 && <button className="btn ghost" onClick={validateConfident}>Valider les {confident} pièces sûres</button>}
        </>
      ) : (
        <form className="form" onSubmit={(e) => { e.preventDefault(); validate(); }}>
          <label>Nom
            <input value={current.name} onChange={(e) => { const v = e.target.value; setItems((l) => [{ ...l![0], name: v }, ...l!.slice(1)]); }}
              onBlur={() => save({ name: current.name })} />
          </label>
          <label>Catégorie
            <select value={current.category}
              onChange={(e) => { const v = e.target.value; setItems((l) => [{ ...l![0], category: v }, ...l!.slice(1)]); save({ category: v }); }}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Formalité (1 à 5)
            <select value={current.formality ?? 3}
              onChange={(e) => { const v = Number(e.target.value); setItems((l) => [{ ...l![0], formality: v }, ...l!.slice(1)]); save({ formality: v }); }}>
              {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
          <label>Marque
            <input value={current.brand ?? ""} placeholder="BZB, Zara…"
              onChange={(e) => { const v = e.target.value; setItems((l) => [{ ...l![0], brand: v }, ...l!.slice(1)]); }}
              onBlur={() => save({ brand: current.brand || null })} />
          </label>
          <button className="btn">Enregistrer et valider</button>
          <button type="button" className="btn ghost danger" onClick={remove}>Supprimer</button>
        </form>
      )}
    </>
  );
}

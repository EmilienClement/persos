"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSignedUrls } from "@/lib/useSigned";
import { CATEGORIES, costPerWear, type Item } from "@/lib/wardrobe";

const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export default function Fiche() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = useState(() => createClient())[0];
  const [item, setItem] = useState<Item | null>(null);
  const [msg, setMsg] = useState("");
  const urls = useSignedUrls([item?.image_path]);

  useEffect(() => {
    supabase.from("items").select("*").eq("id", id).single().then(({ data }) => setItem(data as Item | null));
  }, [supabase, id]);

  if (!item) return <p className="muted">Chargement…</p>;

  const set = <K extends keyof Item>(k: K, v: Item[K]) => setItem({ ...item, [k]: v });
  const save = async (patch: Partial<Item>) => {
    await supabase.from("items").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
  };

  async function wear() {
    const { error } = await supabase.from("wears").insert({ item_id: id });
    if (error?.code === "23505") return setMsg("Déjà notée aujourd’hui.");
    if (error) return setMsg("Erreur, réessaie.");
    const { data } = await supabase.from("items").select("wear_count,last_worn_at").eq("id", id).single();
    if (data) setItem((it) => ({ ...it!, ...data }));
    setMsg("Notée pour aujourd’hui.");
  }
  async function archive() {
    if (!confirm("Archiver cette pièce ? Elle ne sera plus proposée.")) return;
    await save({ status: "archive" });
    router.replace("/dressing");
  }

  const cpw = costPerWear(item.price, item.wear_count);

  return (
    <>
      <Link href="/dressing" className="back">← Dressing</Link>
      <div className="photo">{urls[item.image_path ?? ""] && <img src={urls[item.image_path!]} alt={item.name} />}</div>

      <button className="btn" onClick={wear}>Je la porte</button>
      {msg && <p className="muted small" role="status">{msg}</p>}

      <p className="stats">
        <span><b>{item.wear_count}</b> port{item.wear_count > 1 ? "s" : ""}</span>
        <span><b>{cpw != null ? eur(cpw) : "—"}</b> / port</span>
        <span>{item.last_worn_at ? `dernier : ${new Date(item.last_worn_at).toLocaleDateString("fr-FR")}` : "jamais portée"}</span>
      </p>

      <div className="form">
        <label>Nom<input value={item.name} onChange={(e) => set("name", e.target.value)} onBlur={() => save({ name: item.name })} /></label>
        <label>Catégorie
          <select value={item.category} onChange={(e) => { set("category", e.target.value); save({ category: e.target.value }); }}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Marque<input value={item.brand ?? ""} onChange={(e) => set("brand", e.target.value)} onBlur={() => save({ brand: item.brand || null })} /></label>
        <label>Référence<input value={item.reference ?? ""} onChange={(e) => set("reference", e.target.value)} onBlur={() => save({ reference: item.reference || null })} /></label>
        <label>Taille<input value={item.size ?? ""} onChange={(e) => set("size", e.target.value)} onBlur={() => save({ size: item.size || null })} /></label>
        <label>Prix (€)
          <input inputMode="decimal" value={item.price ?? ""} onChange={(e) => set("price", e.target.value === "" ? null : Number(e.target.value.replace(",", ".")) as never)}
            onBlur={() => save({ price: item.price })} />
        </label>
        <label>Date d’achat<input type="date" value={item.purchased_at ?? ""} onChange={(e) => { set("purchased_at", e.target.value || null); save({ purchased_at: e.target.value || null }); }} /></label>
        <label>État
          <select value={item.condition ?? ""} onChange={(e) => { set("condition", e.target.value || null); save({ condition: e.target.value || null }); }}>
            <option value="">—</option><option value="neuf">neuf</option><option value="bon">bon</option>
            <option value="use">usé</option><option value="a_reparer">à réparer</option>
          </select>
        </label>
      </div>
      <p className="muted small">
        {[item.colors.join(" / "), item.material, item.pattern, item.seasons.join(", "), item.styles.join(", "), item.formality && `formalité ${item.formality}`, item.warmth && `chaleur ${item.warmth}`]
          .filter(Boolean).join(" · ")}
      </p>
      <button className="btn ghost danger" onClick={archive}>Archiver</button>
    </>
  );
}

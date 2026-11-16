"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { costPerWear } from "@/lib/wardrobe";

type It = { id: string; name: string; category: string; colors: string[]; brand: string | null; price: number | null; wear_count: number };
const eur = (n: number) => n.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const HEX: Record<string, string> = {
  noir: "#1c1b19", blanc: "#ffffff", ecru: "#efe8d6", gris: "#9a9a9a", anthracite: "#3d3f44", marine: "#1d2a4a", bleu: "#2f5fa8",
  "bleu-ciel": "#a9c8e8", vert: "#3f7d4e", "vert-bouteille": "#1f4d3a", kaki: "#7a7448", beige: "#d8c7a4", camel: "#b98a52",
  marron: "#5e3b26", bordeaux: "#6b1f2e", rouge: "#b3262e", rose: "#e7a8b5", jaune: "#e5c548", orange: "#d9772b", violet: "#6b4a8f", multicolore: "#b0b0b0",
};

function Bars({ data, color }: { data: [string, number][]; color?: (k: string) => string }) {
  const max = Math.max(1, ...data.map((d) => d[1]));
  return (
    <ul className="bars">
      {data.map(([k, v]) => (
        <li key={k}>
          <span className="lab">{color && <i style={{ background: color(k) }} />}{k}</span>
          <span className="bar"><b style={{ width: `${(v / max) * 100}%` }} /></span>
          <span className="val">{v}</span>
        </li>
      ))}
    </ul>
  );
}
const top = (m: Record<string, number>, n = 8) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n);

export default function Stats() {
  const supabase = useState(() => createClient())[0];
  const [items, setItems] = useState<It[] | null>(null);

  useEffect(() => {
    supabase.from("items").select("id,name,category,colors,brand,price,wear_count").eq("status", "actif").then(({ data }) => setItems((data ?? []) as It[]));
  }, [supabase]);

  if (!items) return <p className="muted">Chargement…</p>;
  if (!items.length) return <><p className="eyebrow">Statistiques</p><h1>Rien à compter</h1><p className="muted">Importe et valide des pièces d’abord.</p></>;

  const spent = items.reduce((s, i) => s + (i.price ?? 0), 0);
  const wears = items.reduce((s, i) => s + i.wear_count, 0);
  const never = items.filter((i) => i.wear_count === 0);
  const priced = items.filter((i) => i.price != null && i.wear_count > 0).map((i) => ({ i, c: costPerWear(i.price, i.wear_count)! })).sort((a, b) => a.c - b.c);
  const colors: Record<string, number> = {}, cats: Record<string, number> = {}, brandSpend: Record<string, number> = {}, catSpend: Record<string, number> = {};
  items.forEach((i) => {
    if (i.colors[0]) colors[i.colors[0]] = (colors[i.colors[0]] ?? 0) + 1;
    cats[i.category] = (cats[i.category] ?? 0) + 1;
    if (i.price) {
      brandSpend[i.brand || "sans marque"] = (brandSpend[i.brand || "sans marque"] ?? 0) + i.price;
      catSpend[i.category] = (catSpend[i.category] ?? 0) + i.price;
    }
  });

  return (
    <>
      <p className="eyebrow">Statistiques</p>
      <h1>Ton dressing en chiffres</h1>
      <p className="stats"><span><b>{items.length}</b> pièces</span><span><b>{wears}</b> ports</span><span><b>{spent ? eur(spent) : "—"}</b> investis</span></p>

      <h2>Couleurs dominantes</h2>
      <Bars data={top(colors)} color={(k) => HEX[k] ?? "#999"} />
      <h2>Catégories</h2>
      <Bars data={top(cats)} />

      <h2>Jamais portées ({never.length})</h2>
      {never.length === 0 ? <p className="muted">Toutes tes pièces ont servi.</p> :
        <ul className="rules">{never.slice(0, 10).map((i) => <li key={i.id}><Link href={`/dressing/${i.id}`}>{i.name}</Link></li>)}</ul>}

      <h2>Coût par port</h2>
      {priced.length === 0 ? <p className="muted">Renseigne des prix et note des ports pour le calculer.</p> : (
        <>
          <p className="eyebrow">Les plus rentables</p>
          <ul className="rules">{priced.slice(0, 5).map(({ i, c }) => <li key={i.id}><Link href={`/dressing/${i.id}`}>{i.name}</Link><span>{c.toFixed(2)} €</span></li>)}</ul>
          <p className="eyebrow">Les moins rentables</p>
          <ul className="rules">{priced.slice(-5).reverse().map(({ i, c }) => <li key={i.id}><Link href={`/dressing/${i.id}`}>{i.name}</Link><span>{c.toFixed(2)} €</span></li>)}</ul>
        </>
      )}

      {spent > 0 && (<>
        <h2>Dépenses par marque</h2><Bars data={top(brandSpend, 6).map(([k, v]) => [k, Math.round(v)])} />
        <h2>Dépenses par catégorie</h2><Bars data={top(catSpend, 6).map(([k, v]) => [k, Math.round(v)])} />
      </>)}
    </>
  );
}

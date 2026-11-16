// Tenue au hasard, sans IA (zéro quota). Règles simples : neutres, formalité proche, rotation 7 jours.
import type { SupabaseClient } from "@supabase/supabase-js";

type It = { id: string; name: string; category: string; colors: string[]; formality: number | null; thumb_path: string | null };
const NEUTRALS = ["noir", "blanc", "ecru", "gris", "anthracite", "marine", "beige", "camel", "marron"];
const TOPS = ["t-shirt", "polo", "chemise", "pull", "gilet", "sweat"];
const BOTTOMS = ["pantalon", "jean", "chino"];
const OUTER = ["veste", "manteau", "costume-veste"];

const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const bright = (items: It[]) => [...new Set(items.map((i) => i.colors[0]).filter((c) => c && !NEUTRALS.includes(c)))];
const near = (a: It, b: It) => a.formality == null || b.formality == null || Math.abs(a.formality - b.formality) <= 1;
const clash = (items: It[]) => {
  const c = items.map((i) => i.colors[0]);
  return (c.includes("noir") && c.includes("marine")) || (c.includes("noir") && c.includes("marron"));
};

export async function shuffleOutfit(supabase: SupabaseClient, withOuter: boolean) {
  const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const [{ data: items }, { data: recent }] = await Promise.all([
    supabase.from("items").select("id,name,category,colors,formality,thumb_path").eq("status", "actif"),
    supabase.from("wears").select("item_id").gte("worn_on", since),
  ]);
  const worn = new Set((recent ?? []).map((w) => w.item_id));
  const pool = ((items ?? []) as It[]).filter((i) => !worn.has(i.id));
  const tops = pool.filter((i) => TOPS.includes(i.category));
  const bottoms = pool.filter((i) => BOTTOMS.includes(i.category));
  const shoes = pool.filter((i) => i.category === "chaussures");
  const outers = pool.filter((i) => OUTER.includes(i.category));
  if (!tops.length || !bottoms.length || !shoes.length) return null;

  for (let n = 0; n < 300; n++) {
    const t = pick(tops), b = pick(bottoms), s = pick(shoes);
    const set = [t, b, s];
    if (withOuter && outers.length) set.push(pick(outers));
    const base = set.slice(1);
    if (!set.every((x) => near(t, x) || x === t) || !base.every((x) => near(b, x))) continue;
    if (bright(set).length > 1 || clash(set)) continue;
    const formality = Math.round(set.reduce((a, i) => a + (i.formality ?? 3), 0) / set.length);
    const { data: row } = await supabase.from("outfits").insert({
      title: "Au hasard", occasion: "libre", accords: "Tirage au hasard : couleurs neutres, formalité proche, pièces non portées cette semaine.",
      formality, source: "manuelle", status: "proposee",
    }).select("id").single();
    if (!row) return null;
    await supabase.from("outfit_items").insert(set.map((i) => ({ outfit_id: row.id, item_id: i.id })));
    return { id: row.id as string, title: "Au hasard", accords: "Tirage au hasard : couleurs neutres, formalité proche, pièces non portées cette semaine.", weather_note: null, formality, items: set.map(({ id, name, category, thumb_path }) => ({ id, name, category, thumb_path })) };
  }
  return null;
}

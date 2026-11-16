import { AiError, generateJson } from "@/lib/ai";
import { occasionById } from "@/lib/occasions";
import { STYLIST_SYSTEM } from "@/lib/prompts/stylist";
import { createClient } from "@/lib/supabase/server";
import { getWeather } from "@/lib/weather";

export const maxDuration = 60;

const ACCESSORIES = ["ceinture", "cravate", "echarpe", "bonnet", "sac", "montre-bijou"];
const TOPS = ["t-shirt", "polo", "chemise", "pull", "gilet", "sweat"];
const BOTTOMS = ["pantalon", "jean", "chino", "short"];
const MAX_POOL = 80;

type Row = {
  id: string; name: string; category: string; colors: string[]; material: string | null; pattern: string | null;
  formality: number | null; warmth: number | null; layer: string | null; styles: string[]; seasons: string[];
  waterproof: boolean; wear_count: number; thumb_path: string | null; image_path: string | null;
};

const shuffle = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map((p) => p[1]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "non_connecte" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    occasion?: string; text?: string; imposedItemId?: string; lat?: number; lon?: number;
  };
  const occ = occasionById(body.occasion ?? "");
  if (!occ) return Response.json({ error: "occasion inconnue" }, { status: 400 });

  // Météo (serveur : on ne fait pas confiance au client)
  let weather = null;
  if (Number.isFinite(body.lat) && Number.isFinite(body.lon)) {
    weather = await getWeather(body.lat!, body.lon!).catch(() => null);
  }
  const feelsMax = weather?.day.feelsMax ?? null;

  // Dressing actif + pièces portées ces 7 derniers jours
  const since = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const [{ data: items }, { data: recent }, { data: taste }] = await Promise.all([
    supabase.from("items")
      .select("id,name,category,colors,material,pattern,formality,warmth,layer,styles,seasons,waterproof,wear_count,thumb_path,image_path")
      .eq("status", "actif"),
    supabase.from("wears").select("item_id").gte("worn_on", since),
    supabase.from("taste_profile").select("summary").maybeSingle(),
  ]);
  const worn = new Set((recent ?? []).map((w) => w.item_id));
  const all = (items ?? []) as Row[];

  // Pré-filtre déterministe (le code fait ce que le prompt ne peut pas garantir)
  let pool = all.filter((i) => {
    if (i.id === body.imposedItemId) return true;
    if (worn.has(i.id)) return false;
    if (occ.noShort && i.category === "short") return false;
    if (feelsMax != null && feelsMax >= 26 && (i.warmth ?? 0) >= 4) return false;
    if (!ACCESSORIES.includes(i.category) && i.formality != null && i.formality < occ.min - 1) return false;
    return true;
  });

  const has = (cats: string[]) => pool.some((i) => cats.includes(i.category));
  const missing = [
    !has(TOPS) && "un haut", !has(BOTTOMS) && "un bas", !has(["chaussures"]) && "des chaussures",
  ].filter(Boolean);
  if (missing.length) {
    return Response.json({
      outfits: [], manque: [],
      message: `Impossible de composer une tenue : il manque ${missing.join(", ")} parmi les pièces disponibles pour cette occasion.`,
    });
  }

  // Plafond de 80 pièces : on garde les moins portées, par catégorie (favorise la rotation)
  if (pool.length > MAX_POOL) {
    const byCat = new Map<string, Row[]>();
    for (const i of shuffle(pool).sort((a, b) => a.wear_count - b.wear_count)) {
      byCat.set(i.category, [...(byCat.get(i.category) ?? []), i]);
    }
    const picked: Row[] = [];
    const lists = [...byCat.values()];
    for (let r = 0; picked.length < MAX_POOL && lists.some((l) => l[r]); r++) {
      for (const l of lists) if (l[r] && picked.length < MAX_POOL) picked.push(l[r]);
    }
    const imposed = all.find((i) => i.id === body.imposedItemId);
    if (imposed && !picked.includes(imposed)) picked[picked.length - 1] = imposed;
    pool = picked;
  }

  const shortToReal = new Map<string, Row>(pool.map((it, n) => [`p${n + 1}`, it]));
  const shortOf = new Map<string, string>([...shortToReal].map(([k, v]) => [v.id, k]));
  const lines = [...shortToReal].map(([k, i]) =>
    `${k} | ${i.name} | ${i.category} | ${i.colors.join("/")} | ${i.material ?? "?"} | ${i.pattern ?? "?"} | F${i.formality ?? "?"} | C${i.warmth ?? "?"} | ${i.layer ?? "?"} | ${i.styles.join(",")}${i.waterproof ? " | imperméable" : ""}`,
  );

  const user = [
    `OCCASION : ${occ.label}. ${occ.rules}`,
    body.text ? `TEXTE LIBRE D'ÉMILIEN : ${body.text.slice(0, 300)}` : null,
    weather
      ? `MÉTÉO : ressenti ${weather.day.feelsMin}° à ${weather.day.feelsMax}° sur la journée, pluie jusqu'à ${weather.day.rainMax} %, vent ${weather.now.wind} km/h, ${weather.now.label}.`
      : "MÉTÉO : indisponible, reste prudent (couche légère).",
    body.imposedItemId && shortOf.has(body.imposedItemId) ? `PIÈCE IMPOSÉE : ${shortOf.get(body.imposedItemId)} (dans les 3 tenues).` : null,
    `PROFIL DE GOÛTS : ${JSON.stringify(taste?.summary ?? {})}`,
    `PIÈCES DISPONIBLES (id | nom | catégorie | couleurs | matière | motif | formalité | chaleur | couche | styles) :\n${lines.join("\n")}`,
  ].filter(Boolean).join("\n\n");

  let raw: { outfits?: unknown; manque?: unknown };
  let model = process.env.AI_MODEL_TEXT ?? "?";
  try {
    const res = await generateJson({ kind: "text", label: "stylist", system: STYLIST_SYSTEM, user });
    model = res.model;
    raw = (res.data ?? {}) as typeof raw;
    await supabase.from("ai_usage").insert({ model, kind: "text", ok: true });
  } catch (e) {
    await supabase.from("ai_usage").insert({ model, kind: "text", ok: false });
    const limited = e instanceof AiError && e.rateLimited;
    return Response.json(
      { error: limited ? "Quota IA atteint pour le moment. Réessaie dans une minute (ou demain)." : "Le styliste n'a pas répondu." },
      { status: limited ? 429 : 502 },
    );
  }

  // Contrôle strict : une tenue n'est gardée que si TOUS ses identifiants existent dans le pool
  const outfits: { title: string; accords: string; weather_note: string | null; items: Row[] }[] = [];
  for (const o of Array.isArray(raw.outfits) ? raw.outfits : []) {
    const ids: unknown[] = Array.isArray((o as { item_ids?: unknown }).item_ids) ? (o as { item_ids: unknown[] }).item_ids : [];
    const its = ids.map((k) => shortToReal.get(String(k)));
    if (its.length < 3 || its.some((x) => !x)) continue; // identifiant inconnu → rejetée
    const uniq = [...new Set(its as Row[])];
    const cats = uniq.map((i) => i.category);
    if (!cats.some((c) => TOPS.includes(c)) || !cats.some((c) => BOTTOMS.includes(c)) || !cats.includes("chaussures")) continue;
    if (body.imposedItemId && !uniq.some((i) => i.id === body.imposedItemId)) continue;
    const t = o as { title?: unknown; accords?: unknown; weather_note?: unknown };
    outfits.push({
      title: typeof t.title === "string" ? t.title.slice(0, 80) : "Tenue",
      accords: typeof t.accords === "string" ? t.accords.slice(0, 300) : "",
      weather_note: typeof t.weather_note === "string" ? t.weather_note.slice(0, 200) : null,
      items: uniq,
    });
  }

  const manque = (Array.isArray(raw.manque) ? raw.manque : [])
    .map((m) => m as { description?: unknown; why?: unknown })
    .filter((m) => typeof m.description === "string")
    .slice(0, 3)
    .map((m) => ({ description: String(m.description).slice(0, 200), why: typeof m.why === "string" ? m.why.slice(0, 300) : "" }));

  // Sauvegarde : tenues proposées + manques (→ « Proposition d'achat »)
  const saved = [];
  for (const o of outfits) {
    const formality = Math.round(o.items.reduce((s, i) => s + (i.formality ?? 3), 0) / o.items.length);
    const { data: row } = await supabase.from("outfits").insert({
      title: o.title, occasion: occ.id, occasion_text: body.text ?? null, accords: o.accords, formality,
      weather: weather ?? null, source: "ia", status: "proposee",
    }).select("id").single();
    if (!row) continue;
    await supabase.from("outfit_items").insert(o.items.map((i) => ({ outfit_id: row.id, item_id: i.id })));
    saved.push({
      id: row.id, title: o.title, accords: o.accords, weather_note: o.weather_note, formality,
      items: o.items.map((i) => ({ id: i.id, name: i.name, category: i.category, thumb_path: i.thumb_path })),
    });
  }
  if (manque.length) {
    await supabase.from("purchase_suggestions").insert(
      manque.map((m) => ({ payload: { source: "styliste", occasion: occ.id, ...m } })),
    );
  }

  return Response.json({
    outfits: saved,
    manque,
    message: saved.length === 0 ? "Aucune tenue valide cette fois. Réessaie, ou ajoute des pièces." : null,
  });
}

import { AiError, generateJson } from "@/lib/ai";
import { PACKING_SYSTEM } from "@/lib/prompts/packing";
import { createClient } from "@/lib/supabase/server";
import { getForecastRange } from "@/lib/weather";

export const maxDuration = 60;
const MAX_POOL = 100;
const TOPS = ["t-shirt", "polo", "chemise", "pull", "gilet", "sweat"];
const BOTTOMS = ["pantalon", "jean", "chino", "short"];

type Row = { id: string; name: string; category: string; colors: string[]; material: string | null; formality: number | null; warmth: number | null; layer: string | null; waterproof: boolean; thumb_path: string | null; wear_count: number };

const addDays = (d: string, n: number) => new Date(new Date(d + "T12:00:00Z").getTime() + n * 86400_000).toISOString().slice(0, 10);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "non_connecte" }, { status: 401 });

  const b = (await request.json().catch(() => ({}))) as { dest?: string; lat?: number; lon?: number; start?: string; nights?: number; purpose?: string };
  const nights = Math.round(Number(b.nights));
  if (!b.dest || !Number.isFinite(b.lat) || !Number.isFinite(b.lon) || !/^\d{4}-\d{2}-\d{2}$/.test(b.start ?? "") || !(nights >= 1 && nights <= 30)) {
    return Response.json({ error: "Destination, date de départ et durée (1 à 30 nuits) requis." }, { status: 400 });
  }
  const purpose = ["loisirs", "pro", "mixte"].includes(b.purpose ?? "") ? b.purpose : "mixte";

  // Prévisions (16 jours max) : au-delà, on le dit à l'IA
  const end = addDays(b.start!, nights);
  const horizon = addDays(new Date().toISOString().slice(0, 10), 15);
  let forecast: Awaited<ReturnType<typeof getForecastRange>> = [];
  if (b.start! <= horizon) {
    forecast = await getForecastRange(b.lat!, b.lon!, b.start!, end < horizon ? end : horizon).catch(() => []);
  }

  const [{ data: items }, { data: taste }] = await Promise.all([
    supabase.from("items").select("id,name,category,colors,material,formality,warmth,layer,waterproof,thumb_path,wear_count").eq("status", "actif"),
    supabase.from("taste_profile").select("summary").maybeSingle(),
  ]);
  let pool = (items ?? []) as Row[];
  if (pool.length < 6) return Response.json({ error: "Pas assez de pièces validées pour préparer une valise." }, { status: 400 });

  if (pool.length > MAX_POOL) {
    const by = new Map<string, Row[]>();
    for (const i of pool) by.set(i.category, [...(by.get(i.category) ?? []), i]);
    const lists = [...by.values()];
    const picked: Row[] = [];
    for (let r = 0; picked.length < MAX_POOL && lists.some((l) => l[r]); r++) for (const l of lists) if (l[r] && picked.length < MAX_POOL) picked.push(l[r]);
    pool = picked;
  }
  const map = new Map(pool.map((it, n) => [`p${n + 1}`, it]));
  const lines = [...map].map(([k, i]) => `${k} | ${i.name} | ${i.category} | ${i.colors.join("/")} | ${i.material ?? "?"} | F${i.formality ?? "?"} | C${i.warmth ?? "?"} | ${i.layer ?? "?"}${i.waterproof ? " | imperméable" : ""}`);

  const user = [
    `DESTINATION : ${String(b.dest).slice(0, 80)}. DÉPART : ${b.start}. DURÉE : ${nights} nuits. MOTIF : ${purpose}.`,
    forecast.length
      ? `PRÉVISIONS :\n${forecast.map((d) => `${d.date} : ressenti ${d.feelsMin}° à ${d.feelsMax}°, pluie ${d.rain} %`).join("\n")}` +
        (forecast.length < nights + 1 ? "\n(Prévisions limitées à 16 jours : le reste du séjour est inconnu.)" : "")
      : "PRÉVISIONS : indisponibles (départ trop lointain). Prévois des couches et une veste.",
    `PROFIL DE GOÛTS : ${JSON.stringify(taste?.summary ?? {})}`,
    `PIÈCES (id | nom | catégorie | couleurs | matière | formalité | chaleur | couche) :\n${lines.join("\n")}`,
  ].join("\n\n");

  let model = process.env.AI_MODEL_TEXT ?? "?";
  let raw: { pieces?: unknown; notes?: unknown; manque?: unknown };
  try {
    const res = await generateJson({ kind: "text", label: "packing", system: PACKING_SYSTEM, user });
    model = res.model;
    raw = (res.data ?? {}) as typeof raw;
    await supabase.from("ai_usage").insert({ model, kind: "text", ok: true });
  } catch (e) {
    await supabase.from("ai_usage").insert({ model, kind: "text", ok: false });
    const limited = e instanceof AiError && e.rateLimited;
    return Response.json({ error: limited ? "Quota IA atteint. Réessaie plus tard." : "La valise n'a pas pu être préparée." }, { status: limited ? 429 : 502 });
  }

  const chosen = [...new Set((Array.isArray(raw.pieces) ? raw.pieces : []).map((k) => map.get(String(k))).filter((x): x is Row => !!x))];
  const manque = (Array.isArray(raw.manque) ? raw.manque : []).map((m) => m as { description?: unknown; why?: unknown })
    .filter((m) => typeof m.description === "string").slice(0, 3)
    .map((m) => ({ description: String(m.description).slice(0, 200), why: typeof m.why === "string" ? m.why.slice(0, 300) : "" }));
  if (manque.length) await supabase.from("purchase_suggestions").insert(manque.map((m) => ({ payload: { source: "valise", ...m } })));

  const tops = chosen.filter((i) => TOPS.includes(i.category)).length;
  const bottoms = chosen.filter((i) => BOTTOMS.includes(i.category)).length;
  return Response.json({
    forecast, notes: typeof raw.notes === "string" ? raw.notes.slice(0, 600) : "", manque,
    combos: tops * bottoms,
    pieces: chosen.map(({ id, name, category, thumb_path }) => ({ id, name, category, thumb_path })),
  });
}

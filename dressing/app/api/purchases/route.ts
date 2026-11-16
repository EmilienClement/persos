import { AiError, generateJson } from "@/lib/ai";
import { PURCHASE_SYSTEM } from "@/lib/prompts/purchase";
import { buildLinks } from "@/lib/shops";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

type It = { id: string; name: string; category: string; colors: string[]; formality: number | null; styles: string[]; wear_count: number };

const count = (arr: string[]) => {
  const m: Record<string, number> = {};
  arr.forEach((x) => (m[x] = (m[x] ?? 0) + 1));
  return m;
};
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : null);
const str = (v: unknown, n = 200) => (typeof v === "string" ? v.slice(0, n) : "");

export async function POST() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "non_connecte" }, { status: 401 });

  const since = new Date(Date.now() - 90 * 86400_000).toISOString();
  const [{ data: items }, { data: occ }, { data: manques }, { data: taste }] = await Promise.all([
    supabase.from("items").select("id,name,category,colors,formality,styles,wear_count").eq("status", "actif"),
    supabase.from("outfits").select("occasion").gte("created_at", since),
    supabase.from("purchase_suggestions").select("payload").eq("status", "ouverte").limit(20),
    supabase.from("taste_profile").select("summary").maybeSingle(),
  ]);
  const all = (items ?? []) as It[];
  if (all.length < 8) return Response.json({ error: "Ajoute au moins 8 pièces validées avant de demander des achats." }, { status: 400 });

  const map = new Map(all.map((i, n) => [`p${n + 1}`, i]));
  const lines = [...map].map(([k, i]) => `${k} | ${i.category} | ${i.colors.join("/")} | F${i.formality ?? "?"}`);
  const never = all.filter((i) => i.wear_count === 0).slice(0, 15).map((i) => i.name);
  const top = [...all].sort((a, b) => b.wear_count - a.wear_count).slice(0, 10).map((i) => `${i.name} (${i.wear_count})`);
  const signaled = (manques ?? []).map((m) => (m.payload as { description?: string }).description).filter(Boolean);

  const user = [
    `RÉSUMÉ : ${all.length} pièces. Catégories : ${JSON.stringify(count(all.map((i) => i.category)))}. ` +
      `Couleurs dominantes : ${JSON.stringify(count(all.map((i) => i.colors[0] ?? "?")))}. ` +
      `Formalités : ${JSON.stringify(count(all.map((i) => String(i.formality ?? "?"))))}. ` +
      `Styles : ${JSON.stringify(count(all.flatMap((i) => i.styles)))}.`,
    `OCCASIONS DEMANDÉES (90 j) : ${JSON.stringify(count((occ ?? []).map((o) => o.occasion)))}`,
    `JAMAIS PORTÉES : ${never.join(", ") || "aucune"}`,
    `LES PLUS PORTÉES : ${top.join(", ")}`,
    `MANQUES DÉJÀ SIGNALÉS : ${signaled.join(" ; ") || "aucun"}`,
    `PROFIL DE GOÛTS : ${JSON.stringify(taste?.summary ?? {})}`,
    `PIÈCES (id | catégorie | couleurs | formalité) :\n${lines.join("\n")}`,
  ].join("\n\n");

  let model = process.env.AI_MODEL_TEXT ?? "?";
  let raw: { suggestions?: unknown };
  try {
    const res = await generateJson({ kind: "text", label: "purchases", system: PURCHASE_SYSTEM, user });
    model = res.model;
    raw = (res.data ?? {}) as typeof raw;
    await supabase.from("ai_usage").insert({ model, kind: "text", ok: true });
  } catch (e) {
    await supabase.from("ai_usage").insert({ model, kind: "text", ok: false });
    const limited = e instanceof AiError && e.rateLimited;
    return Response.json({ error: limited ? "Quota IA atteint. Réessaie plus tard." : "L'analyse a échoué." }, { status: limited ? 429 : 502 });
  }

  const rows = (Array.isArray(raw.suggestions) ? raw.suggestions : []).slice(0, 5).flatMap((s) => {
    const o = s as Record<string, unknown>;
    const title = str(o.title, 120);
    if (!title) return [];
    const ids = (Array.isArray(o.works_with_ids) ? o.works_with_ids : []).map((k) => map.get(String(k))?.id).filter((x): x is string => !!x);
    const unique = [...new Set(ids)];
    const q = (o.search_queries ?? {}) as Record<string, unknown>;
    return [{
      payload: {
        source: "ia", title, category: str(o.category, 40), colors: Array.isArray(o.colors) ? o.colors.map((c) => str(c, 30)).slice(0, 3) : [],
        why: str(o.why, 400), works_with_ids: unique, unlocked: unique.length,
        price_min: num(o.price_min), price_max: num(o.price_max), priority: Math.min(5, Math.max(1, num(o.priority) ?? 3)),
        links: buildLinks({ zara: str(q.zara, 80), bzb: str(q.bzb, 80), vinted: str(q.vinted, 80) }, title),
      },
    }];
  });
  if (!rows.length) return Response.json({ error: "Aucune suggestion exploitable. Réessaie." }, { status: 502 });

  // Remplace les anciennes suggestions IA encore ouvertes
  const { data: old } = await supabase.from("purchase_suggestions").select("id,payload").eq("status", "ouverte");
  const oldIds = (old ?? []).filter((r) => (r.payload as { source?: string }).source === "ia").map((r) => r.id);
  if (oldIds.length) await supabase.from("purchase_suggestions").delete().in("id", oldIds);
  await supabase.from("purchase_suggestions").insert(rows);
  return Response.json({ ok: true, count: rows.length });
}

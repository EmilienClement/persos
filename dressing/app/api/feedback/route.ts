import { generateJson } from "@/lib/ai";
import { TASTE_SYSTEM } from "@/lib/prompts/stylist";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;
const SUMMARIZE_EVERY = 10;

const list = (v: unknown) =>
  (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 160)).slice(0, 12);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "non_connecte" }, { status: 401 });

  const { outfitId, rating, reason } = (await request.json().catch(() => ({}))) as {
    outfitId?: string; rating?: number; reason?: string;
  };
  if (!outfitId || (rating !== 1 && rating !== -1)) return Response.json({ error: "requête invalide" }, { status: 400 });

  // Snapshot construit côté serveur depuis la base (pas depuis le client)
  const { data: outfit } = await supabase.from("outfits").select("occasion,occasion_text,accords,outfit_items(items(name,category,colors,material,pattern,formality))").eq("id", outfitId).single();
  if (!outfit) return Response.json({ error: "tenue introuvable" }, { status: 404 });

  await supabase.from("feedback").insert({
    target_type: "outfit", target_id: outfitId, rating,
    reason: reason?.trim().slice(0, 300) || null, snapshot: outfit,
  });

  // Résumé du profil de goûts tous les 10 retours (1 appel IA)
  const { data: pending } = await supabase.from("feedback").select("id,rating,reason,snapshot").eq("summarized", false).order("created_at");
  let updated = false;
  if (pending && pending.length >= SUMMARIZE_EVERY) {
    try {
      const { data: profile } = await supabase.from("taste_profile").select("summary,feedback_count").maybeSingle();
      const res = await generateJson({
        kind: "text", label: "taste", system: TASTE_SYSTEM,
        user: `PROFIL ACTUEL : ${JSON.stringify(profile?.summary ?? {})}\n\nNOUVEAUX RETOURS :\n${JSON.stringify(pending)}`,
      });
      const s = (res.data ?? {}) as Record<string, unknown>;
      const summary = { likes: list(s.likes), dislikes: list(s.dislikes), never: list(s.never), notes: typeof s.notes === "string" ? s.notes.slice(0, 400) : "" };
      await supabase.from("taste_profile").upsert({
        user_id: auth.user.id, summary, feedback_count: (profile?.feedback_count ?? 0) + pending.length, updated_at: new Date().toISOString(),
      });
      await supabase.from("feedback").update({ summarized: true }).in("id", pending.map((p) => p.id));
      await supabase.from("ai_usage").insert({ model: res.model, kind: "text", ok: true });
      updated = true;
    } catch {
      // Le retour est enregistré ; le résumé sera retenté au prochain vote.
    }
  }
  return Response.json({ ok: true, profileUpdated: updated });
}

import { generateJson, AiError } from "@/lib/ai";
import { TAGGING_SYSTEM } from "@/lib/prompts/tagging";
import { normalizeTags } from "@/lib/wardrobe";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;
const DAILY_CAP = 450; // quota gratuit : 500 requêtes/jour sur le modèle vision

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return Response.json({ error: "non_connecte" }, { status: 401 });

  const { itemId } = (await request.json().catch(() => ({}))) as { itemId?: string };
  if (!itemId) return Response.json({ error: "itemId manquant" }, { status: 400 });

  // Plafond quotidien (le jour compte en heure de Paris côté app, UTC côté base : marge de sécurité).
  const today = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from("ai_usage").select("id", { count: "exact", head: true })
    .eq("day", today).eq("kind", "vision");
  if ((count ?? 0) >= DAILY_CAP) {
    return Response.json({ error: "quota_jour" }, { status: 429 });
  }

  const { data: item } = await supabase.from("items").select("id,image_path").eq("id", itemId).single();
  if (!item?.image_path) return Response.json({ error: "pièce introuvable" }, { status: 404 });

  const file = await supabase.storage.from("wardrobe").download(item.image_path);
  if (file.error || !file.data) return Response.json({ error: "photo introuvable" }, { status: 404 });
  const base64 = Buffer.from(await file.data.arrayBuffer()).toString("base64");

  let model = process.env.AI_MODEL_VISION ?? "?";
  try {
    const res = await generateJson({
      kind: "vision",
      label: "tag",
      system: TAGGING_SYSTEM,
      user: "Catalogue cette pièce.",
      images: [{ mimeType: file.data.type || "image/webp", base64 }],
    });
    model = res.model;
    await supabase.from("ai_usage").insert({ model, kind: "vision", ok: true });

    const tags = normalizeTags(res.data);
    if (!tags) {
      await supabase.from("items").update({ confidence: 0, ai_raw: res.data as object }).eq("id", itemId);
      return Response.json({ ok: true, usable: false });
    }
    await supabase.from("items").update({ ...tags, ai_raw: res.data as object, updated_at: new Date().toISOString() }).eq("id", itemId);
    return Response.json({ ok: true, usable: true, tags });
  } catch (e) {
    await supabase.from("ai_usage").insert({ model, kind: "vision", ok: false });
    if (e instanceof AiError && e.rateLimited) {
      return Response.json({ error: "limite_minute", retryAfter: 65 }, { status: 429 });
    }
    return Response.json({ error: e instanceof Error ? e.message : "erreur IA" }, { status: 502 });
  }
}

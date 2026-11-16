// Appelé chaque jour par le cron Vercel : évite la mise en pause du projet Supabase gratuit
// (pause après 1 semaine d'inactivité). Si CRON_SECRET est défini sur Vercel, il est exigé.
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "non autorisé" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ ok: false, error: "config manquante" }, { status: 503 });

  const { error } = await createClient(url, key, { auth: { persistSession: false } })
    .from("items").select("id", { head: true, count: "exact" }).limit(1);
  return Response.json({ ok: !error });
}

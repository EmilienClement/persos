import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const [{ count: actifs }, { count: aValider }] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }).eq("status", "actif"),
    supabase.from("items").select("id", { count: "exact", head: true }).eq("status", "a_valider"),
  ]);

  return (
    <>
      <p className="eyebrow">Aujourd’hui</p>
      <h1>Bonjour Émilien.</h1>
      <p className="muted">{actifs ?? 0} pièces dans le dressing.</p>

      {(aValider ?? 0) > 0 && (
        <Link href="/valider" className="card-link">
          <strong>{aValider} pièce{(aValider ?? 0) > 1 ? "s" : ""} à valider</strong>
          <span>Un tap par pièce →</span>
        </Link>
      )}
      <p className="muted small">La météo et le styliste arrivent ensuite.</p>
    </>
  );
}

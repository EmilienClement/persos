import Link from "next/link";
import WeatherCard from "@/components/WeatherCard";
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
      <p className="muted">{actifs ?? 0} pièce{(actifs ?? 0) > 1 ? "s" : ""} dans le dressing.</p>
      <WeatherCard />

      {(aValider ?? 0) > 0 && (
        <Link href="/valider" className="card-link">
          <strong>{aValider} pièce{(aValider ?? 0) > 1 ? "s" : ""} à valider</strong>
          <span>Un tap par pièce →</span>
        </Link>
      )}
      <Link href="/styliste" className="btn">Que porter aujourd’hui ?</Link>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocation } from "@/lib/useLocation";

type Taste = { likes: string[]; dislikes: string[]; never: string[]; notes: string };
const EMPTY: Taste = { likes: [], dislikes: [], never: [], notes: "" };
const TABLES = ["items", "wears", "outfits", "outfit_items", "feedback", "taste_profile", "purchase_suggestions"] as const;

export default function Reglages() {
  const router = useRouter();
  const supabase = useState(() => createClient())[0];
  const { place, byCity, byGeolocation } = useLocation();
  const [taste, setTaste] = useState<Taste>(EMPTY);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.from("taste_profile").select("summary").maybeSingle().then(({ data }) => data && setTaste({ ...EMPTY, ...(data.summary as Taste) }));
    const today = new Date().toISOString().slice(0, 10);
    supabase.from("ai_usage").select("model").eq("day", today).then(({ data }) => {
      const c: Record<string, number> = {};
      (data ?? []).forEach((r) => (c[r.model] = (c[r.model] ?? 0) + 1));
      setUsage(c);
    });
  }, [supabase]);

  async function saveTaste(next: Taste) {
    setTaste(next);
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("taste_profile").upsert({ user_id: data.user.id, summary: next, updated_at: new Date().toISOString() });
  }
  const without = (k: "likes" | "dislikes" | "never", i: number) => saveTaste({ ...taste, [k]: taste[k].filter((_, j) => j !== i) });

  async function exportAll() {
    setMsg("Export en cours…");
    const out: Record<string, unknown> = { exported_at: new Date().toISOString(), note: "Les photos restent dans Supabase Storage (chemins dans items.image_path)." };
    for (const t of TABLES) {
      const { data } = await supabase.from(t).select("*");
      out[t] = data ?? [];
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dressing-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg("Export téléchargé.");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <p className="eyebrow">Réglages</p>
      <h1>Réglages</h1>

      <h2>Ville</h2>
      <p className="muted">Actuelle : {place.city}</p>
      <form className="inline" onSubmit={async (e) => {
        e.preventDefault();
        const v = String(new FormData(e.currentTarget).get("city") ?? "").trim();
        setMsg(v && (await byCity(v)) ? "Ville mise à jour." : "Ville introuvable.");
      }}>
        <input name="city" placeholder="Ville" />
        <button className="btn ghost">OK</button>
        <button type="button" className="btn ghost" onClick={async () => setMsg((await byGeolocation()) ? "Position utilisée." : "Position refusée.")}>Ma position</button>
      </form>

      <h2>Profil de goûts</h2>
      <p className="muted small">Résumé automatique de tes 👍/👎 (mis à jour tous les 10 retours). Tu peux le corriger.</p>
      {(["likes", "dislikes", "never"] as const).map((k) => (
        <div key={k}>
          <p className="eyebrow">{{ likes: "Tu aimes", dislikes: "Tu évites", never: "Jamais" }[k]}</p>
          {taste[k].length === 0 && <p className="muted small">—</p>}
          <ul className="rules">
            {taste[k].map((r, i) => <li key={i}>{r}<button className="link" onClick={() => without(k, i)}>retirer</button></li>)}
          </ul>
        </div>
      ))}
      <form className="inline" onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const v = String(f.get("rule") ?? "").trim();
        if (!v) return;
        saveTaste({ ...taste, [String(f.get("kind")) as "likes"]: [...taste[String(f.get("kind")) as "likes"], v].slice(0, 12) });
        e.currentTarget.reset();
      }}>
        <select name="kind" defaultValue="never"><option value="likes">aime</option><option value="dislikes">évite</option><option value="never">jamais</option></select>
        <input name="rule" placeholder="ex. pas de col roulé" />
        <button className="btn ghost">Ajouter</button>
      </form>
      {taste.notes && <p className="muted small">{taste.notes}</p>}

      <h2>Appels IA aujourd’hui</h2>
      {Object.keys(usage).length === 0 ? <p className="muted small">Aucun.</p> :
        <ul className="rules">{Object.entries(usage).map(([m, n]) => <li key={m}>{m} : {n}</li>)}</ul>}

      <h2>Sauvegarde</h2>
      <p className="muted small">L’offre gratuite de Supabase n’a pas de sauvegarde automatique. Exporte de temps en temps.</p>
      <button className="btn" onClick={exportAll}>Exporter mes données (JSON)</button>
      {msg && <p className="muted small" role="status">{msg}</p>}

      <button className="btn ghost danger" onClick={logout}>Se déconnecter</button>
      <p className="muted tiny">Météo : Open-Meteo.com (CC BY 4.0)</p>
    </>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { composeWebp, removeBg, resizeJpeg } from "@/lib/image";

type Row = { key: string; name: string; state: "attente" | "photo" | "ia" | "ok" | "erreur"; note?: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MIN_GAP_MS = 4600; // ≈13 requêtes/minute, sous la limite gratuite de 15

export default function ImportPage() {
  const supabase = useState(() => createClient())[0];
  const [rows, setRows] = useState<Row[]>([]);
  const [detour, setDetour] = useState(true);
  const [running, setRunning] = useState(false);
  const [untagged, setUntagged] = useState<string[]>([]);
  const stop = useRef(false);
  const lastTag = useRef(0);

  const patch = (key: string, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const refreshUntagged = useCallback(async () => {
    const { data } = await supabase.from("items").select("id").eq("status", "a_valider").is("confidence", null);
    setUntagged((data ?? []).map((d) => d.id));
  }, [supabase]);

  useEffect(() => { refreshUntagged(); }, [refreshUntagged]);

  /** Appelle l'étiquetage en respectant le rythme et les limites. Renvoie false si on doit tout arrêter. */
  async function tag(itemId: string, key?: string): Promise<boolean> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const gap = MIN_GAP_MS - (Date.now() - lastTag.current);
      if (gap > 0) await wait(gap);
      lastTag.current = Date.now();
      const res = await fetch("/api/tag", { method: "POST", body: JSON.stringify({ itemId }) });
      if (res.ok) return true;
      const body = await res.json().catch(() => ({}));
      if (body.error === "quota_jour") {
        if (key) patch(key, { state: "erreur", note: "Quota du jour atteint. Reprends demain." });
        return false;
      }
      if (res.status === 429) {
        if (key) patch(key, { note: "Limite par minute, nouvelle tentative…" });
        await wait(65_000);
        continue;
      }
      if (key) patch(key, { state: "erreur", note: "Étiquetage échoué. Il sera relancé." });
      return true;
    }
    if (key) patch(key, { state: "erreur", note: "Étiquetage non terminé. Relance-le ensuite." });
    return true;
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    stop.current = false;
    setRunning(true);
    setRows(list.map((f, i) => ({ key: `${i}-${f.name}`, name: f.name, state: "attente" })));

    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return setRunning(false);

    for (let i = 0; i < list.length; i++) {
      if (stop.current) break;
      const file = list[i];
      const key = `${i}-${file.name}`;
      try {
        patch(key, { state: "photo" });
        const small = await resizeJpeg(file, 1200);
        const cut = detour ? await removeBg(small) : small;
        const main = await composeWebp(cut, 1024, 0.82);
        const thumb = await composeWebp(cut, 320, 0.7);

        const id = crypto.randomUUID();
        const image_path = `${uid}/${id}.webp`;
        const thumb_path = `${uid}/${id}_thumb.webp`;
        const opts = { contentType: "image/webp", upsert: true };
        const [a, b] = await Promise.all([
          supabase.storage.from("wardrobe").upload(image_path, main, opts),
          supabase.storage.from("wardrobe").upload(thumb_path, thumb, opts),
        ]);
        if (a.error || b.error) throw new Error("upload");

        const ins = await supabase.from("items").insert({
          id, name: "Pièce importée", category: "autre", status: "a_valider", image_path, thumb_path,
        });
        if (ins.error) throw new Error("insert");

        patch(key, { state: "ia" });
        const go = await tag(id, key);
        if (!go) break;
        patch(key, (await isTagged(id)) ? { state: "ok" } : {});
      } catch {
        patch(key, { state: "erreur", note: "Photo ignorée (erreur de traitement)." });
      }
    }
    setRunning(false);
    refreshUntagged();
  }

  async function isTagged(id: string) {
    const { data } = await supabase.from("items").select("confidence").eq("id", id).single();
    return data?.confidence != null;
  }

  async function retryUntagged() {
    stop.current = false;
    setRunning(true);
    for (const id of untagged) {
      if (stop.current) break;
      if (!(await tag(id))) break;
    }
    setRunning(false);
    refreshUntagged();
  }

  const done = rows.filter((r) => r.state === "ok").length;

  return (
    <>
      <p className="eyebrow">Import</p>
      <h1>Ajouter des pièces</h1>
      <p className="muted">Choisis 20 à 50 photos. Une pièce par photo, à plat ou sur cintre.</p>

      <label className="check">
        <input type="checkbox" checked={detour} onChange={(e) => setDetour(e.target.checked)} disabled={running} />
        Détourer (lent sur téléphone, meilleur sur Mac)
      </label>

      <label className={`btn ${running ? "disabled" : ""}`}>
        Choisir des photos
        <input type="file" accept="image/*" multiple hidden disabled={running} onChange={(e) => onFiles(e.target.files)} />
      </label>
      {running && <button className="btn ghost" onClick={() => (stop.current = true)}>Arrêter après la photo en cours</button>}

      {untagged.length > 0 && !running && (
        <button className="btn ghost" onClick={retryUntagged}>
          Relancer l’étiquetage ({untagged.length} pièce{untagged.length > 1 ? "s" : ""})
        </button>
      )}

      {rows.length > 0 && (
        <>
          <p className="muted small">{done} / {rows.length} terminées</p>
          <ul className="rows">
            {rows.map((r) => (
              <li key={r.key}>
                <span className="name">{r.name}</span>
                <span className={`state ${r.state}`}>
                  {{ attente: "en attente", photo: "photo…", ia: "étiquetage…", ok: "ok", erreur: "à revoir" }[r.state]}
                </span>
                {r.note && <span className="note">{r.note}</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      {!running && done > 0 && <Link href="/valider" className="btn">Valider les pièces →</Link>}
    </>
  );
}

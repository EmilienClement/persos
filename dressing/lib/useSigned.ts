"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** URLs signées (1 h) pour les photos du bucket privé. */
export function useSignedUrls(paths: (string | null | undefined)[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = paths.filter(Boolean).join("|");

  useEffect(() => {
    const list = key ? key.split("|") : [];
    if (!list.length) return;
    let cancelled = false;
    createClient().storage.from("wardrobe").createSignedUrls(list, 3600).then(({ data }) => {
      if (cancelled || !data) return;
      setUrls(Object.fromEntries(data.flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl] as [string, string]] : []))));
    });
    return () => { cancelled = true; };
  }, [key]);

  return urls;
}

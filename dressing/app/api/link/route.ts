import { safeFetchText } from "@/lib/safeFetch";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 20;

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

function meta(html: string, key: string): string | null {
  const k = key.replace(/[.:]/g, "\\$&");
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']*)["']`, "i"));
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`, "i"));
  return decode((a ?? b)?.[1] ?? "") || null;
}

function jsonLdPrice(html: string): number | null {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const stack: unknown[] = [JSON.parse(m[1])];
      while (stack.length) {
        const n = stack.pop();
        if (Array.isArray(n)) stack.push(...n);
        else if (n && typeof n === "object") {
          const o = n as Record<string, unknown>;
          const p = o.price ?? o.lowPrice;
          if (p != null && Number.isFinite(Number(p))) return Number(p);
          stack.push(...Object.values(o));
        }
      }
    } catch {}
  }
  return null;
}

export async function POST(request: Request) {
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return Response.json({ error: "non_connecte" }, { status: 401 });

  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  if (!url) return Response.json({ error: "Lien manquant." }, { status: 400 });

  try {
    const { html, finalUrl } = await safeFetchText(url.trim());
    const price = Number(meta(html, "product:price:amount") ?? meta(html, "og:price:amount")) || jsonLdPrice(html);
    const title = meta(html, "og:title") ?? decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "");
    let image = meta(html, "og:image");
    try { if (image) image = new URL(image, finalUrl).toString(); } catch { image = null; }
    if (image && !image.startsWith("https://")) image = null;
    return Response.json({ title: title.slice(0, 160) || null, image, price: price || null, url: finalUrl });
  } catch (e) {
    return Response.json({ error: `Lecture impossible (${e instanceof Error ? e.message : "erreur"}). Remplis à la main.` }, { status: 422 });
  }
}

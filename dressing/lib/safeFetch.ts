// Lecture d'une page web côté serveur avec protection SSRF : https uniquement,
// refus des adresses privées/locales (y compris après redirection), taille et durée limitées.
import { lookup } from "node:dns/promises";
import net from "node:net";

function isPrivate(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return isPrivate(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
}

async function assertPublic(url: URL) {
  if (url.protocol !== "https:") throw new Error("https uniquement");
  if (url.username || url.password) throw new Error("adresse invalide");
  if (net.isIP(url.hostname)) throw new Error("adresse IP refusée");
  const addrs = await lookup(url.hostname, { all: true });
  if (!addrs.length || addrs.some((a) => isPrivate(a.address))) throw new Error("adresse refusée");
}

export async function safeFetchText(raw: string, maxBytes = 1_500_000): Promise<{ html: string; finalUrl: string }> {
  let url = new URL(raw);
  for (let hop = 0; hop < 4; hop++) {
    await assertPublic(url);
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "Mozilla/5.0 (compatible; DressingBot/1.0)", accept: "text/html,application/xhtml+xml" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url);
      continue;
    }
    if (!res.ok) throw new Error(`le site répond ${res.status}`);
    if (!(res.headers.get("content-type") ?? "").includes("html")) throw new Error("ce n'est pas une page web");
    const reader = res.body?.getReader();
    if (!reader) throw new Error("page vide");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
    reader.cancel().catch(() => {});
    return { html: Buffer.concat(chunks).toString("utf8"), finalUrl: url.toString() };
  }
  throw new Error("trop de redirections");
}

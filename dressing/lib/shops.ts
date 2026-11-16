// Liens de recherche uniquement (pas d'API marchande). Les mots-clés viennent de l'IA,
// les URL sont construites ici : l'IA n'invente jamais d'adresse.
const enc = encodeURIComponent;

export type ShopLink = { label: string; url: string };

export function buildLinks(q: { zara?: string; bzb?: string; vinted?: string }, fallback: string): ShopLink[] {
  const links: ShopLink[] = [];
  const z = q.zara || fallback;
  const v = q.vinted || fallback;
  const b = q.bzb || fallback;
  links.push({ label: "Zara", url: `https://www.zara.com/fr/fr/search?searchTerm=${enc(z)}` });
  links.push({ label: "BZB", url: `https://www.google.com/search?q=${enc("BZB " + b)}` });
  links.push({ label: "Vinted", url: `https://www.vinted.fr/catalog?search_text=${enc(v)}` });
  return links;
}

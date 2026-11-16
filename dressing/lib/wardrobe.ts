export const CATEGORIES = [
  "t-shirt","polo","chemise","pull","gilet","sweat","veste","manteau","costume-veste",
  "pantalon","jean","chino","short","chaussures","ceinture","cravate","echarpe",
  "bonnet","sac","montre-bijou","autre",
] as const;
export const COLORS = [
  "noir","blanc","ecru","gris","anthracite","marine","bleu","bleu-ciel","vert",
  "vert-bouteille","kaki","beige","camel","marron","bordeaux","rouge","rose",
  "jaune","orange","violet","multicolore",
] as const;
export const PATTERNS = ["uni","rayures","carreaux","pied-de-poule","chevrons","imprime","autre"] as const;
export const SEASONS = ["printemps","ete","automne","hiver"] as const;
export const STYLES = ["basique","chic","old-school","decontracte"] as const;
export const LAYERS = ["base","intermediaire","exterieur","n/a"] as const;

export type Item = {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  colors: string[];
  material: string | null;
  pattern: string | null;
  seasons: string[];
  formality: number | null;
  styles: string[];
  warmth: number | null;
  layer: string | null;
  waterproof: boolean;
  brand: string | null;
  reference: string | null;
  size: string | null;
  price: number | null;
  purchased_at: string | null;
  condition: string | null;
  status: "a_valider" | "actif" | "archive";
  image_path: string | null;
  thumb_path: string | null;
  wear_count: number;
  last_worn_at: string | null;
  confidence: number | null;
};

export type Tags = Pick<
  Item,
  "name" | "category" | "subcategory" | "colors" | "material" | "pattern" | "seasons" |
  "formality" | "styles" | "warmth" | "layer" | "waterproof" | "brand"
> & { confidence: number };

const pick = <T extends readonly string[]>(list: T, v: unknown): T[number] | null =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T[number]) : null;
const pickMany = <T extends readonly string[]>(list: T, v: unknown, max = 4): T[number][] =>
  Array.isArray(v) ? [...new Set(v.map((x) => pick(list, x)).filter((x): x is T[number] => !!x))].slice(0, max) : [];
const int15 = (v: unknown) => {
  const n = Math.round(Number(v));
  return n >= 1 && n <= 5 ? n : null;
};

/** Nettoie la réponse de l'IA : on ne fait confiance à aucune valeur hors liste. */
export function normalizeTags(raw: unknown): Tags | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (r.usable === false) return null;
  const conf = Number(r.confidence);
  return {
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, 120) : "Pièce sans nom",
    category: pick(CATEGORIES, r.category) ?? "autre",
    subcategory: typeof r.subcategory === "string" ? r.subcategory.slice(0, 60) : null,
    colors: pickMany(COLORS, r.colors, 3),
    material: typeof r.material === "string" ? r.material.slice(0, 40) : null,
    pattern: pick(PATTERNS, r.pattern),
    seasons: pickMany(SEASONS, r.seasons),
    formality: int15(r.formality),
    styles: pickMany(STYLES, r.styles),
    warmth: int15(r.warmth),
    layer: pick(LAYERS, r.layer),
    waterproof: r.waterproof === true,
    brand: typeof r.brand_guess === "string" && r.brand_guess.trim() ? r.brand_guess.trim().slice(0, 60) : null,
    confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0.5,
  };
}

export const costPerWear = (price: number | null, wears: number) =>
  price != null && wears > 0 ? price / wears : null;

// Vérifie que les variables d'environnement sont présentes (sans jamais les afficher).
export const dynamic = "force-dynamic";

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AI_PROVIDER",
  "AI_API_KEY",
  "AI_MODEL_VISION",
  "AI_MODEL_TEXT",
] as const;

export function GET() {
  const env = Object.fromEntries(REQUIRED.map((k) => [k, Boolean(process.env[k])]));
  return Response.json({ ok: Object.values(env).every(Boolean), env });
}

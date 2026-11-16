# Dressing

Dressing connecté privé (PWA Next.js + Supabase + IA).

## Démarrage local

```bash
cp .env.example .env.local   # puis remplir les valeurs
npm install
npm run dev
```

## Vérification

`GET /api/health` indique quelles variables d'environnement sont présentes
(booléens uniquement, aucune valeur n'est exposée).

## Déploiement

Vercel, Root Directory `dressing`. Les clés restent côté serveur.

## Écrans

Aujourd'hui (météo) · Dressing · Fiche pièce · Import en lot · Validation · Styliste (3 tenues, 👍/👎, planifier, au hasard) ·
Propositions d'achat · Calendrier · Valise · Statistiques · Wishlist (import par lien) · Réglages (ville, profil de goûts, export).

## Base de données

1. `supabase/schema.sql` (SQL Editor → Run)
2. `supabase/migrations/002_wishlist.sql`

## Variables d'environnement

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_PROVIDER`, `AI_API_KEY`,
`AI_MODEL_VISION`, `AI_MODEL_TEXT`, `AI_MODEL_TEXT_FALLBACK` (optionnelle), `CRON_SECRET` (optionnelle, protège `/api/keepalive`).

Passer de Gemini à Claude : `AI_PROVIDER=anthropic`, `AI_API_KEY`, `AI_MODEL_*`.

## Tests

Voir `TESTS.md`.

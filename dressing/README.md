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

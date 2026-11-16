# Checklist de tests

À faire sur la Preview (ou la production). Cocher au fur et à mesure.
Note d'abord : sur Vercel, ajoute `AI_MODEL_TEXT_FALLBACK=gemini-3.5-flash-lite` et exécute `supabase/schema.sql`,
puis `supabase/migrations/002_wishlist.sql`.

## 0. Avant tout
- [ ] `/api/health` renvoie `"ok": true`
- [ ] Connexion email + mot de passe, puis rechargement : toujours connecté
- [ ] Une page privée ouverte en navigation privée (déconnecté) renvoie vers `/login`

## 1. Import (le plus important)
- [ ] 5 photos, détourage décoché : chaque ligne passe à « ok »
- [ ] Les étiquettes (catégorie, couleurs, formalité) sont plausibles. Sinon, noter lesquelles
- [ ] Si « Étiquetage échoué » : essayer `AI_MODEL_VISION=gemini-3.1-flash-lite`
- [ ] 5 photos avec détourage : le résultat est propre, la durée acceptable
- [ ] Couper le Wi-Fi en cours d'import : aucune perte, « Relancer l'étiquetage » fonctionne
- [ ] Valider : Valider / Corriger / Supprimer / « Valider les pièces sûres »

## 2. Dressing et fiche
- [ ] Grille, recherche, 5 filtres
- [ ] Fiche : modifier marque, prix, taille, date ; recharger : tout est conservé
- [ ] « Je la porte » : ports +1, coût par port calculé, un 2e clic le jour même dit « déjà notée »

## 3. Météo et styliste
- [ ] Accueil : météo de Nantes ; « Ma position » (autoriser la localisation)
- [ ] Styliste, « Sortie en ville » : 3 tenues, chacune avec haut + bas + chaussures
- [ ] Aucune pièce affichée n'est absente de ton dressing
- [ ] Pièce imposée : présente dans les 3 tenues
- [ ] « Je la porte » puis redemander : les pièces portées ne reviennent pas (7 jours)
- [ ] 👍 / 👎 avec « pourquoi » : pas d'erreur ; après 10 votes, Réglages affiche un profil de goûts
- [ ] « Au hasard (sans IA) » fonctionne

## 4. Autres écrans
- [ ] Planifier une tenue, la voir dans Calendrier, la marquer portée
- [ ] Achats (avec ≥ 8 pièces) : 3 à 5 propositions, 3 liens qui s'ouvrent
- [ ] Valise : destination + date dans les 16 jours, prévisions affichées, pièces issues du dressing
- [ ] Stats : nombres cohérents avec le dressing
- [ ] Wishlist : ajout manuel ; import par lien (certains sites bloquent : c'est normal)
- [ ] Réglages : export JSON téléchargé et lisible

## 5. PWA et appareils
### Android (Chrome)
- [ ] Menu ⋮ → Installer l'application ; l'icône apparaît
- [ ] Lancée depuis l'icône : plein écran, pas de barre d'adresse
- [ ] Import depuis la galerie ou l'appareil photo
- [ ] Mode avion : page « Hors ligne », pas d'erreur blanche
### iPhone (Safari)
- [ ] Partager → Sur l'écran d'accueil ; l'icône apparaît
- [ ] Import : photos HEIC acceptées
- [ ] La session reste ouverte après fermeture de l'app
### Windows (Chrome ou Edge) et Mac
- [ ] Installer depuis la barre d'adresse (icône d'installation)
- [ ] Import de 20+ photos avec détourage (le plus rapide sur Mac)
- [ ] Mise en page lisible sur grand écran

## 6. Sécurité
- [ ] Une URL de photo signée expire (plus d'accès après environ 1 h)
- [ ] `/api/tag`, `/api/stylist` sans être connecté : 401
- [ ] Aucune clé visible dans le code source de la page (Ctrl+U)

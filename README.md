# FIADO — V1

Registre de credit mutualise pour commercants ouest-africains. Voir le
document de reference complet (spec produit) partage separement.

## Etat de ce livrable

Le code fonctionne **des maintenant, sans aucune cle**, en mode local
(Dexie/IndexedDB) : inscription par swipe, carnet de credit, relances
(simulees), recherche de fiabilite, admin — tout est utilisable et
teste (`npm run build` passe, voir plus bas). Rien n'est envoye a un
serveur tant que les variables Supabase ne sont pas renseignees.

Pour que les relances WhatsApp et la connexion partent reellement,
il faut brancher tes propres cles Supabase + Meta — etapes ci-dessous.

## 1. Lancer en local (mode demo, zero configuration)

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000 — tu verras l'accueil avec des donnees
d'exemple, le bouton "+", et le parcours d'inscription par swipe
complet (telephone + email, sans aucun code a saisir puisque la
verification se fait en base — voir la section connexion plus bas).

## 2. Brancher Supabase

1. Cree un projet sur https://supabase.com
2. Dans l'editeur SQL, execute dans l'ordre :
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_cron.sql` (apres l'etape 4)
   - `supabase/migrations/0003_merchant_email.sql`
3. Copie `.env.local.example` en `.env.local`, renseigne
   `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Project Settings > API).
4. Deploie les fonctions Edge de compte (aucune cle Meta requise pour
   celles-ci) :
   ```bash
   supabase functions deploy register
   supabase functions deploy login
   ```

Des que ces deux variables sont presentes, l'app synchronise chaque
ecriture locale vers Supabase en arriere-plan (voir `lib/sync.ts`) —
sans rien casser du mode hors-ligne. La connexion/inscription bascule
aussi automatiquement de la verification 100% locale au verrou base
de donnees (telephone + email) des que Supabase repond (voir
`lib/auth-context.tsx`). A noter : cette verification est une
correspondance en base, pas une preuve de possession du telephone ou
de l'email — plus simple et rapide, mais moins forte qu'un vrai code
de confirmation (voir le commentaire dans `supabase/functions/login`).

## 3. Brancher WhatsApp pour les relances (bridge Baileys, non-officiel)

Uniquement necessaire pour les relances automatiques de paiement — la
connexion/inscription n'utilise plus WhatsApp (voir section 2).

Ce depot appelle un bridge WhatsApp separe (voir le depot
`whatsapp-bridge`, README dedie) plutot que l'API Cloud Meta — pas de
compte developpeur, pas de carte bancaire, pas de templates a faire
approuver. En contrepartie ce chemin viole les conditions
d'utilisation de WhatsApp (risque de bannissement du numero connecte)
et demande un petit serveur qui tourne en continu (pas serverless) —
voir les mises en garde dans le README du bridge avant de deployer.

1. Deploie et connecte le bridge (voir son README) : `npm install`,
   scanner le QR, heberger en continu (VPS, ~5$/mois)
2. Deploie la fonction de relances et branche-la au bridge :
   ```bash
   supabase functions deploy send-reminders
   supabase secrets set WHATSAPP_BRIDGE_URL=https://ton-serveur.example.com
   supabase secrets set WHATSAPP_BRIDGE_TOKEN=<le meme BRIDGE_TOKEN que cote bridge>
   ```
3. Execute `0002_cron.sql` en remplacant `<PROJECT_REF>` et `<ANON_KEY>`

Le webhook (`whatsapp-webhook`) et les variables `META_WA_*` restent
dans le code mais ne sont plus utilises par `send-reminders` — utiles
uniquement si tu reviens un jour a l'API officielle Meta.

Cout attendu : pas de cout par message (bridge non-officiel), mais un
petit hebergement en continu pour le bridge (~5$/mois) — voir son
README.

## 4. Deployer sur Vercel

```bash
vercel
```

Renseigne les memes variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) dans les parametres du projet Vercel.

## 5. Acceder a l'admin

`/admin` — code de demo : `fiado-admin` (defini en dur dans
`app/admin/page.tsx`). **A remplacer avant toute mise en production**
par une verification server-side sur liste blanche d'emails (voir le
commentaire en tete de ce fichier) — jamais une simple verification
cote client comme celle livree ici pour la demo.

## Ce qui est explicitement HORS V1

Abonnement payant, paiement sur la plateforme, transferts d'argent,
rapprochement Mobile Money automatique — la base de donnees est
prete a les accueillir (`merchants.plan`) mais rien n'est actif.

## Tests effectues

- `npm run build` : compilation TypeScript + production build Next.js
- Parcours manuel : accueil demo -> onboarding swipe -> compte cree ->
  ajout creance -> marquage paye -> recherche/score -> admin
- Non teste (necessite tes propres cles) : verification email+telephone
  reelle via Supabase (register/login), envoi reel WhatsApp des
  relances, synchronisation Supabase reelle, cron de relance

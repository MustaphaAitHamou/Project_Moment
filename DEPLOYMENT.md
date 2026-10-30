# Déploiement — Tamurt Events

> Aucun déploiement externe n'a été réalisé depuis cet environnement de développement. Chaque étape ci-dessous
> nécessite vos comptes et vos validations ; ne considérez une étape comme faite qu'après confirmation réelle.

## 0. Dépôt GitHub
1. Créer un dépôt **privé** vide `tamurt-events`, puis pousser l'historique local :

```bash
git remote add origin git@github.com:<compte>/tamurt-events.git
```

```bash
git push -u origin main
```

2. Activer la protection de la branche `main` (CI obligatoire) et ajouter les secrets nécessaires (§3, §4).

## 1. Supabase hébergé (production, puis un projet séparé pour la préproduction)
1. Créer le projet (région proche des utilisateurs, ex. eu-west-3), noter l'URL, la clé `anon`/publishable et la clé
   `service_role`/secret (à garder **côté serveur uniquement**).
2. Appliquer les migrations :

```bash
pnpm exec supabase link --project-ref <ref>
```

```bash
pnpm exec supabase db push
```

3. **Ne pas** exécuter `pnpm db:seed` en production (comptes et contenus fictifs). Pour une démonstration publique,
   utiliser un projet dédié et `SEED_DEMO_ALLOW_REMOTE=true` en connaissance de cause.
4. Auth : URL du site (`site_url`), URLs de redirection (`https://<domaine>/auth/confirm`), SMTP personnalisé,
   modèles d'e-mails (`supabase/templates`), protection contre la réutilisation des mots de passe.
5. Vérifier que `pg_cron` est activé (tâches d'expiration, archivage, rappels, nettoyage).
6. Sauvegardes : activer le PITR selon l'offre.

## 2. Vercel (site web + API)
1. Importer le dépôt, **Root Directory = `apps/web`** (Vercel installe depuis la racine pnpm). `vercel.json` fixe
   l'installation, la construction (`pnpm run build`, qui copie le worker MapLibre) et la tâche planifiée.
2. Variables d'environnement (Production et Preview séparées) :

| Variable | Portée | Remarque |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | public | URL canonique (ex. https://tamurt.events) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | protégées par la RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | jamais exposée au navigateur |
| `TAMURT_SERVER_SECRET` | **secret** | ≥ 32 caractères, obligatoire en production |
| `CRON_SECRET` | **secret** | Vercel l'envoie en `Authorization: Bearer` à `/api/cron/maintenance` |
| `DEMO_PROVIDER_WEBHOOK_SECRET` | secret | webhooks du fournisseur fictif |
| `SMTP_*`, `EMAIL_FROM`, `EMAIL_ALLOWLIST` | secret | e-mails applicatifs ; liste blanche en préproduction |
| `GEOCODING_CONTACT_EMAIL` | serveur | requis par Nominatim |
| `PUSH_NOTIFICATIONS_ENABLED`, `EXPO_ACCESS_TOKEN` | serveur | push après consentement |
| `TICKETING_LIVE_PROVIDERS` | serveur | **vide** tant qu'aucun accord n'est signé |

3. Tâche planifiée : `vercel.json` déclare un appel quotidien (compatible offre Hobby). Avec l'offre Pro, passer à
   `*/5 * * * *` pour l'envoi rapide des notifications ; ajouter `?db=1` seulement si `pg_cron` est indisponible.
4. Les prévisualisations ne sont jamais indexées (`robots.txt` bloquant hors production) ; la protection par mot de
   passe de Vercel n'est **pas** une autorisation applicative.
5. Domaine : configurer le DNS, puis vérifier `https://<domaine>/api/health`.

## 3. Applications mobiles (Expo / EAS)
1. Créer un compte Expo, puis dans `apps/mobile` :

```bash
npx eas-cli login
```

```bash
npx eas-cli init
```

2. Définir dans EAS (Environment variables) : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
   `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_HOST`, `EAS_PROJECT_ID`, `IOS_BUNDLE_ID`, `ANDROID_PACKAGE`
   (identifiants **à confirmer** : `com.tamurtservices.events` par défaut), éventuellement `GOOGLE_MAPS_ANDROID_API_KEY`.
3. Profils (`eas.json`) : `development` (client de développement), `preview` (distribution interne, APK Android),
   `production` (stores, numéro de build incrémenté à distance).
4. Builds :

```bash
npx eas-cli build --profile preview --platform all
```

   ou via le workflow GitHub manuel « EAS Build » (secret `EXPO_TOKEN`).

### TestFlight (iOS)
Compte Apple Developer (99 USD/an), application créée dans App Store Connect (même bundle ID), build `production`,
puis `npx eas-cli submit --platform ios`. Renseigner la confidentialité (App Privacy), le chiffrement
(`usesNonExemptEncryption: false`), les testeurs internes/externes ; publier le lien TestFlight dans
Administration → Paramètres → bêta.

### Google Play (test interne)
Compte Google Play Console (25 USD), application créée avec le même package, compte de service pour la soumission
(fichier JSON **hors dépôt**), `npx eas-cli submit --platform android` (piste `internal`, brouillon), formulaire
« Sécurité des données », puis lien de test dans Administration → Paramètres → bêta.

## 4. Après la mise en ligne
- Créer le premier administrateur : promouvoir un compte réel via SQL (`insert into user_roles (user_id, role) values (…, 'admin')`).
- Vérifier : `/api/health`, connexion, création d'organisation, modération, e-mails, tâche planifiée.
- Activer la surveillance (journaux Vercel, alertes Supabase), et réaliser un test de restauration de sauvegarde.

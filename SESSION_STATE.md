# SESSION_STATE — Tamurt Events

> Fichier de reprise : un nouvel agent doit pouvoir continuer le travail à partir d'ici.
> Dernière mise à jour : 2026-10-30 (web, mobile, CI et documentation livrés).

## 1. Ce qui est terminé et vérifié

| Domaine | Vérification |
|---|---|
| Monorepo pnpm 10 + Turborepo, TS 6 strict, ESLint 9 | `pnpm typecheck`, `pnpm lint` |
| Supabase : 18 migrations, 59 tables, 105 politiques RLS, pg_cron | `pnpm db:reset`, `pnpm db:lint`, 62 tests d'intégration |
| Paquets `core`, `validation`, `i18n`, `ui`, `ticketing`, `payments`, `server`, `api-client`, `types` | ~110 tests unitaires (`pnpm test`) |
| Données de démonstration fictives | `pnpm db:seed`, `pnpm demo:reset` |
| `apps/web` (Next.js 16) : ~60 pages, 30 routes `/api/v1`, SEO, CSP à nonce, administration | `pnpm build:web`, 15 tests E2E (`pnpm test:e2e`) |
| `apps/mobile` (Expo SDK 58, RN 0.88) : 5 onglets + création, ~25 écrans | 8 tests Jest, `expo export` Android et iOS |
| CI GitHub Actions (qualité, base + E2E, mobile), EAS manuel, Dependabot, `vercel.json` | fichiers dans `.github/`, `apps/web/vercel.json` |
| Documentation | README, ARCHITECTURE, SECURITY, API_INTEGRATIONS, DEPLOYMENT, ROADMAP, TASKS, docs/LEGAL_CHECKLIST |

## 2. Ce qui n'a PAS été fait (et pourquoi)

- Aucun déploiement externe (Vercel, Supabase hébergé, EAS, stores) : nécessite les comptes de Tamurt Services LLC.
- Historique non poussé sur GitHub : dépôt privé `tamurt-events` à créer (le jeton GitHub du conteneur était invalide).
- Builds natifs iOS/Android non exécutés ici (pas de Xcode/SDK Android) : seuls les bundles JavaScript sont vérifiés.
- Carte web non visible dans ce conteneur : `tiles.openfreemap.org` est bloqué par le proxy réseau (le repli liste fonctionne).
- `expo-doctor` : 18/20 vérifications, les 2 autres exigent un accès réseau à `exp.host` (bloqué ici).

## 3. Problèmes rencontrés et solutions

- Registres Docker : utiliser `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io`. Après un redémarrage du conteneur :
  relancer `dockerd` puis `supabase start -x studio,imgproxy,supavisor,logflare,vector,edge-runtime,realtime`.
- `safeupdate` : tout `DELETE`/`UPDATE` doit avoir un `WHERE`.
- RPC générées : paramètres facultatifs déclarés `default null` côté SQL.
- Compteurs d'événements : GUC transactionnel `tamurt.internal_counters` dans les fonctions internes.
- Next.js 16 : `proxy.ts` (ex-middleware) ; pas de `loading.tsx` au niveau `[locale]` (sinon « soft 404 » en 200) ;
  fonctions utilitaires partagées serveur/client hors des fichiers `'use client'`.
- MapLibre 6 : worker copié dans `apps/web/public/maplibre/` (scripts `predev`/`prebuild`) pour la CSP.
- React Native : une seule copie de React exigée (`overrides` dans `pnpm-workspace.yaml` + `react` en devDependency
  de `i18n` et `server`) ; supprimer `node_modules/use-intl/node_modules/react` si une ancienne copie subsiste.
- Testing Library RN 14 : `render` et `fireEvent` sont asynchrones (`await`).
- `pkill -f "<motif>"` tue le shell courant si le motif figure dans la commande : l'exécuter seul, motif `[n]ext start`.

## 4. Commandes pour reprendre

```bash
pnpm install
pnpm db:start            # Docker requis
pnpm db:reset            # migrations + données fictives
pnpm setup:local         # apps/web/.env.local et apps/mobile/.env.local depuis `supabase status`
pnpm dev:web             # http://localhost:3000
pnpm test && pnpm test:integration && pnpm test:e2e && pnpm test:mobile
```

Comptes fictifs : `<rôle>@tamurt-demo.example` / `Demo-Tamurt-2026`
(admin, moderateur, organisateur, association, testeur, acheteur, visiteur).

## 5. Actions qui nécessitent Tamurt Services LLC

1. Créer le dépôt GitHub **privé et vide** `tamurt-events` puis autoriser l'accès (ou pousser soi-même, voir DEPLOYMENT.md §0).
2. Projets Supabase (prod + préprod), Vercel, compte Expo/EAS, Apple Developer, Google Play Console.
3. Domaine, SMTP, `GEOCODING_CONTACT_EMAIL`, adresse de sécurité et de support.
4. Confirmer les identifiants d'application (`com.tamurtservices.events` par défaut).
5. Validation juridique (documents provisoires, revente, paiements) — voir docs/LEGAL_CHECKLIST.md.
6. Accords avec des partenaires de billetterie et un prestataire de paiement avant toute vente réelle.

## 6. Prochaine tâche précise

Après création du dépôt : pousser `main`, vérifier que la CI passe sur GitHub, puis déployer une préproduction
(Supabase préprod + Vercel Preview) en suivant DEPLOYMENT.md ; ensuite téléversement d'images de couverture
(voir TASKS.md « Améliorations identifiées »).

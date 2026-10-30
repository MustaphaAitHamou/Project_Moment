# SESSION_STATE — Tamurt Events

> Fichier de reprise : un nouvel agent doit pouvoir continuer le travail à partir d'ici.
> Dernière mise à jour : 2026-10-30 (session initiale).

## 1. Ce qui est terminé

| Domaine | État | Vérification |
|---|---|---|
| Monorepo pnpm + Turborepo, configs TS strict / ESLint | ✅ | `pnpm typecheck`, `pnpm lint` |
| Supabase local (Docker) + 17 migrations | ✅ | `supabase db reset` sans erreur, `pnpm db:lint` sans erreur |
| Schéma : 55 tables, RLS sur 100 % des tables, ~110 politiques | ✅ | 17 tests RLS d'intégration |
| Fonctions transactionnelles (checkout, revente, bêta, fournisseur fictif) | ✅ | tests d'intégration |
| pg_cron : expiration, archivage, rappels, nettoyage | ✅ | `select * from cron.job` |
| `@tamurt/core` (argent entier, tarification, fuseaux/DST, calendrier, ICS, permissions, états) | ✅ | 54 tests |
| `@tamurt/validation` (Zod partagé, messages = clés i18n) | ✅ | 13 tests |
| `@tamurt/i18n` (fr, en complets ; ar complet mais **brouillon non vérifié**, RTL) | ✅ | 11 tests (parité des clés, ICU) |
| `@tamurt/ui` (tokens clair/sombre, affiches génératives, logo, CSS généré) | ✅ | 7 tests (contraste AA) |
| `@tamurt/ticketing` (capacités, registre démo/réel, DemoTicketProvider, contrat) | ✅ | 15 tests |
| `@tamurt/payments` (paiement simulé, aucun numéro de carte) | ✅ | 5 tests |
| `@tamurt/server` (services checkout, revente, bêta, événements, compte, notifications, géocodage, maintenance) | ✅ | 61 tests d'intégration + 6 unitaires |
| Données de démonstration fictives réinitialisables | ✅ | `pnpm db:seed`, `pnpm demo:reset` |

## 2. Ce qui reste à développer (ordre prévu)

1. `apps/web` — Next.js 16 (App Router, Tailwind 4, next-intl fr/en/ar) : toutes les pages, routes API `/api/v1/*`, SEO, E2E Playwright.
2. `apps/mobile` — Expo SDK 58 (Expo Router, 5 onglets), tests Jest, export des bundles, configuration EAS.
3. `packages/api-client` — requêtes Supabase partagées + client REST typé (mobile).
4. CI GitHub Actions, configuration Vercel, documentation finale.

## 3. Problèmes rencontrés et solutions

- Registres Docker : `public.ecr.aws` (quota) et `ghcr.io` (blobs refusés par le proxy). Solution : `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io` (et re-tag manuel si une image manque).
- Supabase `safeupdate` : tout `DELETE`/`UPDATE` sans `WHERE` est refusé, même dans une fonction → toujours écrire une clause `WHERE`.
- Les types générés pour les RPC marquent tous les paramètres comme obligatoires : donner `default null` aux paramètres optionnels côté SQL.
- Les fonctions SECURITY DEFINER internes qui modifient des compteurs d'événements positionnent `tamurt.internal_counters` (GUC transactionnel, non modifiable via l'API).
- Le dépôt GitHub privé n'existe pas encore (jeton GitHub du conteneur invalide) — **action utilisateur requise**, voir §5.

## 4. Commandes pour reprendre

```bash
pnpm install
pnpm db:start            # Docker requis ; dans ce conteneur : SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io
pnpm db:reset            # migrations + données de démo
pnpm test                # tests unitaires (turbo)
pnpm test:integration    # tests d'intégration (Supabase local démarré)
```

Comptes de démo : `<role>@tamurt-demo.example` / `Demo-Tamurt-2026` (admin, moderateur, organisateur, association, testeur, acheteur, visiteur).

## 5. Actions qui nécessitent l'utilisateur

- Créer un dépôt GitHub **privé et vide** `tamurt-events` (compte `MustaphaAitHamou`) pour pousser l'historique.
- Plus tard : projet Supabase hébergé, projet Vercel, compte Expo/EAS, comptes Apple Developer et Google Play (voir DEPLOYMENT.md).

## 6. Prochaine tâche précise

Créer `apps/web` (Next.js 16) : layout localisé `[locale]`, intégration Supabase SSR (`@supabase/ssr`), page d'accueil + recherche + fiche événement, puis routes API `/api/v1/checkout/*`.

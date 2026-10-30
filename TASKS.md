# TASKS — Tamurt Events

Légende : ✅ fait et vérifié · 🟡 en cours · ⬜ à faire · 🔒 dépend d'un tiers ou d'une décision de Tamurt Services LLC

## Phase 1 — Initialisation
- ✅ Monorepo pnpm/Turborepo, configs partagées, scripts `setup:local` et `doctor` (Windows/macOS/Linux)
- ✅ Supabase local (Docker), Auth (confirmation e-mail, mots de passe forts)

## Phase 2 — Backend
- ✅ 18 migrations (référentiels, profils/rôles, organisateurs, lieux, événements, billetterie, revente, notifications,
  modération/audit, bêta, recherche, RLS, stockage, cron, géocodage, démo, équipe)
- ✅ Services serveur + 62 tests d'intégration
- ✅ Données de démonstration fictives réinitialisables

## Phase 3 — Web
- ✅ Next.js 16 : ~60 pages, 30 routes API, SEO (métadonnées, hreflang, sitemap, robots, JSON-LD hors démo, OG), CSP
- ✅ 15 tests E2E Playwright, build de production vérifié

## Phase 4 — Mobile
- ✅ Expo SDK 58 : 5 onglets + création, parcours achat/revente/billets/notifications/paramètres/bêta
- ✅ 8 tests Jest, exports Android/iOS vérifiés, `eas.json`
- 🔒 Builds natifs EAS, TestFlight, Google Play (comptes requis)

## Phases 5-7 — Billetterie, revente, bêta
- ✅ Fournisseur fictif complet, achat simulé, revente encadrée (démo), programme bêta
- 🔒 Connecteurs réels, paiements réels, revente réelle (accords + validation juridique)

## Phase 8-9 — Qualité et déploiement
- ✅ GitHub Actions (qualité, base + E2E, mobile), workflow EAS manuel, Dependabot, `vercel.json`
- ✅ Documentation : README, ARCHITECTURE, SECURITY, API_INTEGRATIONS, DEPLOYMENT, ROADMAP, check-list juridique
- 🔒 Dépôt GitHub privé, projets Supabase/Vercel/Expo, domaine, SMTP

## Améliorations identifiées
- ⬜ Téléversement d'images de couverture (web/mobile) — stockage, politiques et modération déjà prêts
- ⬜ Sélecteurs de date natifs sur mobile ; carte dans l'agenda ; flux iCal personnel
- ⬜ Relecture native de l'arabe ; catalogues tamazight par des locuteurs natifs
- ⬜ Formatage Prettier global du dépôt puis contrôle `format:check` en CI

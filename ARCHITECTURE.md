# Architecture — Tamurt Events

## Vue d'ensemble

```
tamurt-events/
├── apps/
│   ├── web/        Next.js 16 (App Router, Turbopack, Tailwind 4, next-intl) — site + API REST /api/v1
│   └── mobile/     Expo SDK 58 (React Native 0.88, Expo Router) — applications iOS et Android natives
├── packages/
│   ├── core/       Règles métier pures : argent (entiers), tarification, fuseaux/DST, calendrier, ICS, permissions, états
│   ├── validation/ Schémas Zod partagés (messages = clés i18n)
│   ├── i18n/       Catalogues ICU fr / en / ar (RTL, brouillon) + architecture prête pour le tamazight
│   ├── ui/         Design system (jetons clair/sombre, catégories, affiches génératives SVG, logo)
│   ├── ticketing/  Contrat des connecteurs de billetterie, capacités déclarées, registre, fournisseur FICTIF
│   ├── payments/   Prestataires de paiement (simulé uniquement ; réel désactivé)
│   ├── server/     Services serveur (achat, revente, bêta, événements, notifications, géocodage, maintenance)
│   ├── api-client/ Requêtes Supabase partagées (RLS) + client REST typé (web et mobile)
│   ├── types/      Types générés de la base + alias
│   └── config/     tsconfig / ESLint partagés
├── supabase/       config.toml, 18 migrations SQL, modèles d'e-mails
├── scripts/        seed (données fictives), setup:local, doctor, génération des types
└── .github/        CI (qualité, base + E2E, mobile), build EAS manuel, Dependabot
```

Outils : pnpm 10 (workspaces, `node-linker=hoisted` pour React Native), Turborepo, TypeScript 6 strict,
ESLint 9 (flat), Vitest 5, Playwright 1.63, Jest (jest-expo).

## Flux principaux

### Lecture publique
Pages serveur (Server Components) → client Supabase lié aux cookies (`@supabase/ssr`) → PostgREST →
fonctions SQL `search_events`, `agenda_events`, `map_events`… **La RLS s'applique toujours** ; les contenus non
publiés ne sont visibles que de leur équipe et de la modération.

### Écritures
- **Simples** (favoris, inscription, profil, annonces, modération) : Server Actions du web ou client Supabase du mobile,
  sous RLS, avec fonctions `SECURITY DEFINER` à `search_path` vide quand une règle transverse est nécessaire.
- **Sensibles** (achat, revente, invitations bêta, offres fictives) : API REST `/api/v1` → services `@tamurt/server`
  (client service-role, jamais exposé) → fonctions SQL transactionnelles réservées au rôle service.

### Achat (démonstration)
1. `POST /checkout/reservations` (clé d'idempotence) : blocage des places chez le fournisseur (verrou, expiration),
   instantané de prix (`computePricing` : valeur faciale, frais fournisseur, frais de service, promotion, taxes).
2. `POST /checkout/orders` : une commande unique par réservation.
3. `POST /checkout/orders/:id/pay` : paiement SIMULÉ (succès/refus/erreur au choix), verrou par commande,
   confirmation chez le fournisseur, émission de billets **spécimens** (sans code d'accès) ; compensation
   (libération, remboursement) en cas d'échec. Expiration automatique (pg_cron).

### Revente
Billets émis via Tamurt uniquement, prix plafonné par pays (règles `resale_rules`), réservation de l'annonce,
paiement simulé, **réémission** du billet à l'acheteur (l'ancien est invalidé), historique et litiges.
La revente réelle exige l'ensemble des conditions de `missingResaleLiveConditions` (plateforme, pays, juridique,
fournisseur, contrat, transfert sécurisé, vérification de propriété).

## Modèle de données (extraits)

- **Référentiels** : pays (devise, fuseau, conventions de semaine), régions, villes, catégories, paramètres.
- **Identité** : `profiles`, `user_roles` (organizer, moderator, admin, beta_tester), préférences de notification.
- **Organisateurs** : profils (particulier/association/professionnel), membres et rôles (owner, admin, editor, analyst),
  invitations, demandes de vérification, lieux, artistes.
- **Événements** : statut (draft → pending_review → published → cancelled/archived, rejected), visibilité, fuseau
  local, sessions, médias modérés, favoris, inscriptions, annonces, statistiques quotidiennes, recherche plein texte
  (tsvector + trigrammes + unaccent) et géographique (PostGIS).
- **Billetterie** : fournisseurs, offres (environnement demo/live), accords commerciaux (statut « simulation »),
  promotions, réservations, commandes, lignes, billets, références de paiement, remboursements, idempotence,
  limitation de débit, webhooks ; schéma `demo_provider` isolé pour le fournisseur fictif.
- **Revente** : règles, annonces, transactions (machine d'états), journal, litiges, signalements.
- **Confiance** : signalements, actions de modération, **journal d'audit immuable**, programme bêta.

## Décisions techniques

| Sujet | Décision | Raison |
|---|---|---|
| Argent | Entiers en unités mineures, calculs en BigInt, points de base, arrondi au demi supérieur | Aucune erreur d'arrondi flottant |
| Temps | Instants UTC en base, fuseau IANA par événement, conversions via `Intl` uniquement | Affichage à l'heure locale de chaque événement, DST géré (trous et doublons) |
| Semaine | Convention par pays (Algérie : samedi, week-end vendredi-samedi) | Agenda et filtre « ce week-end » corrects |
| Connecteurs | Capacités déclarées explicitement ; méthode absente = `capability_not_supported` | Aucune fausse intégration |
| Démo / réel | Colonne `environment` partout + contraintes SQL + registre strict | Impossible de mélanger les flux |
| Web | Rendu dynamique, `proxy.ts` (CSP à nonce, session, langue), pas de `cacheComponents` | Sécurité et simplicité ; vraies 404 |
| Cartes | MapLibre + OpenFreeMap (web, sans clé) ; Apple Plans / Google Maps (mobile) | Pas d'API payante sur le web |
| Géocodage | Nominatim (OSM) avec contact, 1 requête/s, cache en base | Respect de la politique d'usage |
| i18n | ICU partagé web/mobile ; arabe marqué « brouillon non vérifié » ; tamazight prévu, non inventé | Pas de traduction non vérifiée présentée comme définitive |
| Mobile | Session dans le trousseau (découpage), API par jeton Bearer | Pas de cookie, stockage sécurisé |

## Conventions

- Messages d'erreur = codes machine (`AppError`) traduits côté interface (`errors.*`) ; jamais de détail interne exposé.
- Toute nouvelle table : RLS activée + politiques + tests ; toute fonction sensible : `SECURITY DEFINER`,
  `search_path = ''`, droits d'exécution explicites.
- Toute nouvelle clé i18n : ajoutée aux trois catalogues (test de parité).
- Les pages privées sont `noindex` ; les contenus fictifs ne sont jamais dans le sitemap ni dans le JSON-LD.

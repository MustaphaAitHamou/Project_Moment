# Tamurt Events

Plateforme internationale de **découverte, création, réservation et revente encadrée d'événements**
pour la France (EUR), l'Algérie (DZD), les États-Unis (USD) et le Canada (CAD).
Éditeur : **Tamurt Services LLC**.

> **État actuel : démonstration / bêta.** Les événements, organisateurs, lieux, billets et paiements
> marqués « Démo » sont **fictifs**. Aucun paiement réel n'est encaissé, aucun billet réel n'est vendu,
> la revente réelle est désactivée et aucune intégration avec un partenaire de billetterie n'existe :
> les connecteurs réels exigent des accords commerciaux, des accès API officiels et une validation juridique
> (voir [API_INTEGRATIONS.md](API_INTEGRATIONS.md) et [docs/LEGAL_CHECKLIST.md](docs/LEGAL_CHECKLIST.md)).

## Ce qui est livré

| Brique | Contenu | Vérification |
|---|---|---|
| **Site web** (`apps/web`) | Next.js 16 (App Router), fr / en / ar (RTL), ~60 pages : accueil, recherche à filtres, agenda mois/semaine/jour/liste, carte (MapLibre + OpenFreeMap), fiches événement/organisateur/lieu/artiste, pays, villes, catégories, archives, compte, billets, commandes, favoris, notifications, revente, espace organisateur, administration, Tamurt Beta, pages légales provisoires | `pnpm build:web`, 15 tests E2E Playwright |
| **API REST** (`/api/v1`) | Achat (réservation → commande → paiement simulé), revente, événements, offres fictives, organisateurs, bêta, compte, jetons push, géocodage, calendrier `.ics`, cron, webhooks signés | tests d'intégration + E2E |
| **Applications mobiles** (`apps/mobile`) | Expo SDK 58 / React Native 0.88 (natif, pas de WebView) : 5 onglets Découvrir · Agenda · Billets · Favoris · Profil + bouton Créer, achat simulé, billets hors ligne autorisés, revente, notifications sur consentement, calendrier de l'appareil, carte | 8 tests Jest, export des bundles Android et iOS |
| **Backend** (`supabase/`) | PostgreSQL + Auth + Storage + RLS (59 tables, 105 politiques), fonctions transactionnelles, pg_cron, audit immuable | 62 tests d'intégration |
| **Paquets partagés** (`packages/`) | `core` (argent en entiers, tarification, fuseaux/DST, calendrier, ICS), `validation` (Zod), `i18n`, `ui` (design system, affiches génératives), `ticketing` (connecteurs à capacités déclarées, fournisseur fictif), `payments` (paiement simulé), `server` (services), `api-client`, `types` | ~110 tests unitaires |

## Identité visuelle

Tamurt Events suit la DA de la famille **Tamurt Services** : la nuit et les néons d'une ville en fête.
- **Couleurs** : nuit violette (`#140A2E`), rose néon (`#FF4FA3`), cyan électrique (`#2FE6F0`). Ce sont les mêmes fonds dans les deux thèmes, comme une salle de concert ; le sélecteur de thème a été retiré de l'en-tête.
- **Polices** : Kaushan Script pour les grands titres (l'enseigne lumineuse, classe `titre-neon`), Tilt Neon pour l'interface. Noto Sans prend le relais pour les lettres kabyles, IBM Plex Sans Arabic pour l'arabe.
- **Formes** : boutons en pilule, en capitales espacées, avec un halo rose (principal) ou cyan (secondaire) ; cartes à 18 px ; frise « égaliseur » sous l'accueil.
- **Fichiers** : jetons dans `packages/ui/src/tokens.ts` (web et mobile, puis `pnpm --filter @tamurt/ui build:css`) ; logos dans `apps/web/public/brand` ; icônes web et mobile issues du kit.
- **Bouton yaz** : il apparaît en haut à droite quand `TAMURT_SERVICES_URL` est renseignée.

## Démarrage rapide (Windows, macOS, Linux)

Prérequis : **Node.js 22**, **pnpm 10** (`corepack enable`), **Docker Desktop** (pour Supabase local).

```bash
pnpm install
```

```bash
pnpm db:start
```

```bash
pnpm db:reset
```

```bash
pnpm setup:local
```

```bash
pnpm dev:web
```

Le site est alors disponible sur http://localhost:3000 (redirigé vers `/fr`). `pnpm doctor` diagnostique l'environnement.

Application mobile (Expo Go ne suffit pas pour toutes les fonctions natives ; utilisez un build de développement EAS pour la carte et les notifications) :

```bash
pnpm dev:mobile
```

### Comptes de démonstration (fictifs)

Mot de passe commun : `Demo-Tamurt-2026` — adresses `<rôle>@tamurt-demo.example` :
`admin`, `moderateur`, `organisateur`, `association`, `testeur`, `acheteur`, `visiteur`.
Ces comptes n'existent que dans la base locale créée par `pnpm db:seed`.

## Commandes utiles

| Commande | Rôle |
|---|---|
| `pnpm typecheck` / `pnpm lint` / `pnpm test` | Vérifications de tout le dépôt (Turborepo) |
| `pnpm test:integration` | Tests contre Supabase local (RLS, achat, revente, bêta, événements) |
| `pnpm test:e2e` | Tests Playwright (construit puis démarre le site sur le port 3100) |
| `pnpm test:mobile` | Tests Jest de l'application mobile |
| `pnpm db:reset` / `pnpm demo:reset` | Réinitialiser la base / uniquement les données de démonstration |
| `pnpm db:types` | Régénérer les types TypeScript de la base |
| `pnpm db:lint` | Lint SQL des schémas `public` et `demo_provider` |

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — structure, flux, décisions techniques
- [SECURITY.md](SECURITY.md) — modèle de sécurité, contrôles, signalement de vulnérabilités
- [API_INTEGRATIONS.md](API_INTEGRATIONS.md) — connecteurs de billetterie, paiements, cartes, e-mails, push
- [DEPLOYMENT.md](DEPLOYMENT.md) — Supabase hébergé, Vercel, EAS, TestFlight, Google Play
- [ROADMAP.md](ROADMAP.md) — prochaines étapes · [TASKS.md](TASKS.md) — état détaillé
- [SESSION_STATE.md](SESSION_STATE.md) — fichier de reprise pour la prochaine session de travail
- [docs/LEGAL_CHECKLIST.md](docs/LEGAL_CHECKLIST.md) — points juridiques et commerciaux à valider

## Principes non négociables

- Démonstration et réel strictement séparés (`environment = demo | live` à chaque niveau, vente réelle impossible sans activation explicite côté serveur).
- Aucune donnée de carte bancaire n'est demandée ni stockée ; aucun QR code fictif n'est présenté comme un billet valable.
- Aucun secret dans le dépôt : tout passe par des variables d'environnement (`.env.example` documentés).
- Administration inaccessible aux utilisateurs non autorisés (404 + contrôles en base).

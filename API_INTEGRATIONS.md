# Intégrations — Tamurt Events

Ce document décrit **ce qui existe réellement** et ce qu'il faudra pour brancher de vrais partenaires.
Aucune intégration réelle n'est implémentée ni présentée comme existante.

## 1. Billetterie : connecteurs à capacités déclarées (`packages/ticketing`)

Chaque fournisseur implémente `TicketingConnector` et **déclare explicitement** ses capacités :

| Capacité | Méthode(s) | Usage |
|---|---|---|
| `catalog.events`, `catalog.pricing` | `listEvents` | Synchroniser le catalogue |
| `inventory.categories`, `inventory.availability` | `listOffers`, `getAvailability` | Catégories et disponibilités |
| `inventory.hold` | `createHold`, `releaseHold` | Blocage temporaire des places |
| `order.confirm`, `order.status` | `confirmOrder`, `getOrder` | Commande chez le fournisseur |
| `delivery.retrieve` | `getDelivery` | Récupération du titre d'accès émis par le fournisseur |
| `refund` | `refundOrder` | Remboursement |
| `ticket.transfer`, `ticket.ownership_verification` | `transferTicket`, `verifyOwnership` | Revente sécurisée (réémission) |
| `checkout.provider_payment` / `checkout.distributor_payment` | — | Qui encaisse : le fournisseur ou Tamurt (distributeur) |

Règles : une méthode appelée sans la capacité correspondante lève `capability_not_supported` (`requireMethod`) ;
`assertConnectorConsistency` vérifie à l'enregistrement que capacités et méthodes concordent ; le registre
(`ConnectorRegistry`) ne renvoie un connecteur **réel** que s'il est listé dans `TICKETING_LIVE_PROVIDERS`
**et** que le pays, l'accord commercial et l'interrupteur global le permettent (contrôles également en base).

### Fournisseur FICTIF (`demo`) — entièrement fonctionnel
- Inventaire, blocages avec expiration, confirmation, remboursement, transfert, vérification de propriété,
  stockés dans le schéma isolé `demo_provider` ; contrôle de concurrence (aucune survente testée à 25 accès simultanés).
- Webhooks signés (`x-demo-signature: t=…,v1=HMAC-SHA256`) reçus sur `/api/webhooks/demo`.
- Billets émis : spécimens sans code d'accès ni QR code.
- Les organisateurs peuvent créer des offres fictives sur leurs événements (`POST /api/v1/events/:id/offers`).

### Partenaires prévus — aucun accord, aucune capacité
Ticketmaster, France Billet, See Tickets, Weezevent apparaissent dans l'administration avec le statut
« aucun accord » et **zéro capacité**. Aucun logo ni mention laissant croire à un partenariat n'est affiché.
Aucun robot d'achat sur les sites publics de billetteries n'est utilisé ni prévu.

### Brancher un vrai partenaire (après signature)
1. Obtenir : contrat de distribution, accès API (sandbox puis production), documentation, conditions de
   revente/transfert, modèle de rémunération (commission, partage de frais, remise catalogue) — l'objectif de
   10 % est une **cible de négociation**, pas un acquis.
2. Implémenter `packages/ticketing/src/providers/<id>/` (connecteur + tests de contrat `runDemoStoreContract`
   adaptés), déclarer uniquement les capacités réellement offertes.
3. Enregistrer l'accord dans `commercial_agreements` (statut `active`, paramètres signés) ; sans accord actif,
   aucun frais ni commission n'est prélevé et aucune promotion n'est financée.
4. Configurer les secrets côté serveur (Vercel), ajouter l'identifiant à `TICKETING_LIVE_PROVIDERS`,
   activer le pays (`countries.ticket_sales_live_enabled`) puis `app_settings.commerce.live_enabled` — après
   validation juridique et tests en sandbox.

## 2. Paiements (`packages/payments`)
- `DemoPaymentProvider` : scénarios succès / refus / erreur, aucune donnée de carte.
- Mode réel **désactivé** (`live_mode_disabled`). Pour l'activer : prestataire agréé (Stripe, Adyen, CIB/Edahabia via
  un acquéreur algérien…), champs de carte hébergés (PCI DSS hors périmètre Tamurt), webhooks signés, 3-D Secure,
  remboursements, rapprochement comptable — puis tests et validation juridique.
- Pour une revente réelle, aucun encaissement tant que la livraison sécurisée (transfert par le fournisseur)
  n'est pas garantie.

## 3. Cartes et géocodage
- Web : MapLibre GL + tuiles **OpenFreeMap** (gratuit, sans clé, attribution OpenStreetMap affichée).
- Mobile : Apple Plans (iOS, sans clé) ; Google Maps sur Android **uniquement si** `GOOGLE_MAPS_ANDROID_API_KEY`
  est fourni (le SDK Maps Android est gratuit mais nécessite un projet Google Cloud) — sinon repli sans carte.
- Géocodage : Nominatim (OSM) avec `GEOCODING_CONTACT_EMAIL` obligatoire, 1 requête/s, cache `geocode_cache` ;
  désactivé si le contact n'est pas configuré. Pour un fort volume : instance Nominatim dédiée ou service payant.

## 4. E-mails
- Authentification (confirmation, réinitialisation) : envoyés par Supabase Auth (SMTP à configurer dans Supabase).
- Applicatifs (bêta, notifications) : SMTP via `SMTP_*` ; `EMAIL_ALLOWLIST` limite les destinataires en préproduction.
  En local, Mailpit capture tout (aucun envoi réel).

## 5. Notifications push
- Expo Push (`PUSH_NOTIFICATIONS_ENABLED=true`, `EXPO_ACCESS_TOKEN` recommandé) ; jetons enregistrés uniquement
  après consentement explicite dans l'application ; jamais de notification de démonstration envoyée à de vraies personnes.
- Prérequis : projet EAS (`EAS_PROJECT_ID`), identifiants APNs (Apple) et FCM (Google) gérés par EAS.

## 6. API REST Tamurt (`/api/v1`)
Authentification : `Authorization: Bearer <jeton Supabase>` (mobile) ou cookie de session (web, même origine).
Erreurs : `{ "error": { "code", "message", "details?" } }` (message traduit selon `Accept-Language`).
Opérations sensibles avec en-tête `Idempotency-Key`. Client typé : `createTamurtApi` (`packages/api-client`).

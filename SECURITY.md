# Sécurité — Tamurt Events

## Signaler une vulnérabilité

Merci de ne pas ouvrir d'issue publique. Écrivez à l'adresse de sécurité de Tamurt Services LLC
([adresse à définir], par ex. security@<domaine>) avec une description et les étapes de reproduction.
Une réponse est attendue sous 5 jours ouvrés. Aucune action de test ne doit viser des données réelles d'utilisateurs.

## Modèle de sécurité

| Couche | Contrôles |
|---|---|
| **Base de données** | RLS sur 100 % des tables (105 politiques), droits de colonnes, fonctions `SECURITY DEFINER` à `search_path` vide, fonctions sensibles réservées au rôle service (`42501` sinon), gardes de cycle de vie et colonnes protégées, journal d'audit immuable (ni UPDATE ni DELETE), `safeupdate` |
| **Authentification** | Supabase Auth, confirmation d'e-mail obligatoire, mots de passe de 10 caractères minimum (majuscule, minuscule, chiffre), jetons vérifiés côté serveur (`getUser`), suspension prise en compte partout |
| **Autorisation** | Rôles plateforme (admin, moderator, beta_tester…) et rôles d'organisation (owner, admin, editor, analyst) avec matrice de permissions identique en SQL et en TypeScript ; administration en **404** pour les non-autorisés et revérifiée en base (`assert_staff` / `assert_admin`) |
| **API** | Jeton Bearer (mobile) ou cookie de session (web) ; **CSRF** : origine obligatoire pour les requêtes à cookie ; validation Zod ; corps limités à 64 Ko ; limitation de débit en base ; clés d'idempotence (rejeu, conflit, requête en cours) ; erreurs sans détail interne |
| **Web** | CSP par requête avec nonce + `strict-dynamic`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS en production ; aucune indexation hors production ; redirections internes uniquement (`safeReturnPath`) ; contenu utilisateur jamais injecté en HTML |
| **Paiements** | Mode simulé uniquement : aucun numéro de carte demandé ni stocké ; un futur prestataire réel devra utiliser ses champs hébergés (PCI DSS) ; verrou par commande contre le double débit ; remboursement compensatoire |
| **Billets** | Billets de démonstration sans code d'accès ni QR code ; un PDF ou un QR fourni par un utilisateur n'est jamais considéré comme preuve d'authenticité ; revente par réémission uniquement |
| **Webhooks** | Signature HMAC-SHA256 avec horodatage (anti-rejeu, 5 min), enregistrement idempotent ; fournisseurs inconnus refusés |
| **Mobile** | Session dans le Keychain/Keystore, aucune clé secrète dans l'application (clé Supabase publique protégée par la RLS) ; permissions (position, calendrier, notifications) demandées uniquement à l'action de l'utilisateur |
| **Secrets** | Aucun secret dans le dépôt ; `.env.local` ignorés ; secrets serveur (`SUPABASE_SERVICE_ROLE_KEY`, `TAMURT_SERVER_SECRET`, `CRON_SECRET`, `DEMO_PROVIDER_WEBHOOK_SECRET`, SMTP) uniquement dans Vercel/EAS ; le serveur refuse de démarrer en production sans `TAMURT_SERVER_SECRET` |

## Points d'attention

- Une protection par mot de passe d'une URL de prévisualisation Vercel **n'est pas** une autorisation applicative :
  les contrôles d'accès restent ceux de l'application et de la base.
- `style-src 'unsafe-inline'` est conservé (attributs `style` de React, next/image, MapLibre) ; les scripts restent
  strictement contrôlés par nonce.
- Les comptes de démonstration (`*@tamurt-demo.example`, mot de passe public) ne doivent **jamais** être créés en
  production : le script de seed refuse une base distante sans `SEED_DEMO_ALLOW_REMOTE=true`.
- Rotation recommandée des secrets serveur à chaque départ d'un membre de l'équipe ayant eu accès à Vercel/Supabase.

## Vérifications automatisées

Tests d'intégration RLS (accès croisés, rôles, suspension, audit immuable, fonctions réservées au service),
tests E2E (CSP, CSRF, 404 d'administration, redirection des pages privées), lint SQL (`supabase db lint`).

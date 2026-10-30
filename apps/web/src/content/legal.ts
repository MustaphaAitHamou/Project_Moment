/**
 * Documents juridiques PROVISOIRES (bêta). Ils doivent être relus et validés par un juriste
 * pour chaque pays (France/UE, Algérie, États-Unis, Canada) avant toute mise en production.
 * Les éléments entre crochets sont à compléter par Tamurt Services LLC.
 * Aucune traduction arabe n'est fournie tant qu'une version n'a pas été rédigée et relue :
 * l'interface arabe affiche la version française.
 */
export type LegalDoc = 'terms' | 'privacy' | 'cookies' | 'notice';
export const LEGAL_DOCS: LegalDoc[] = ['terms', 'privacy', 'cookies', 'notice'];
export const LEGAL_UPDATED_AT = '2026-10-30';

interface Section {
  title: string;
  paragraphs: string[];
}

type Library = Record<LegalDoc, Section[]>;

const fr: Library = {
  terms: [
    { title: 'Objet', paragraphs: ['Tamurt Events, édité par Tamurt Services LLC, est une plateforme de découverte, de création et de réservation d’événements en France, en Algérie, aux États-Unis et au Canada. Les présentes conditions encadrent l’utilisation du site et des applications mobiles.'] },
    { title: 'Phase de démonstration et de bêta', paragraphs: ['La plateforme fonctionne actuellement en mode démonstration. Les événements, organisateurs, lieux, billets et paiements marqués « Démo » sont fictifs : aucun billet réel n’est vendu, aucun paiement réel n’est encaissé et les billets de démonstration ne donnent accès à aucun événement.', 'Certaines fonctionnalités sont réservées aux bêta-testeurs invités. Le service est fourni « en l’état » pendant la bêta et peut évoluer ou être interrompu.'] },
    { title: 'Comptes', paragraphs: ['L’utilisateur fournit des informations exactes, protège ses identifiants et reste responsable de l’usage de son compte. Tamurt peut suspendre un compte en cas d’abus, de fraude ou de violation des présentes conditions.'] },
    { title: 'Publication d’événements', paragraphs: ['La publication est gratuite. L’organisateur garantit l’exactitude des informations publiées et détenir les droits sur les textes et images qu’il diffuse. Il ne mentionne que des artistes réellement programmés. Les événements des organisations non vérifiées sont relus par la modération avant publication.'] },
    { title: 'Billetterie et revente', paragraphs: ['La vente réelle de billets ne sera proposée qu’avec des partenaires de billetterie ayant conclu un accord avec Tamurt ; les conditions du partenaire s’appliqueront alors. La revente entre particuliers n’est possible que pour des billets émis via Tamurt, au prix plafonné, avec réémission du billet à l’acheteur, et uniquement lorsque la loi applicable l’autorise. Un PDF ou un QR code fourni par un utilisateur ne garantit pas l’authenticité d’un billet.'] },
    { title: 'Signalements et modération', paragraphs: ['Tout utilisateur peut signaler un contenu ou une annonce suspects. La modération peut retirer un contenu, refuser une publication ou suspendre un compte. Les décisions sont journalisées.'] },
    { title: 'Responsabilité', paragraphs: ['[Clauses de responsabilité, de garantie et de limitation à rédiger et valider par un juriste pour chaque pays.]'] },
    { title: 'Droit applicable et contact', paragraphs: ['[Droit applicable, juridiction compétente et médiation de la consommation à définir.] Contact : [adresse e-mail du support].'] },
  ],
  privacy: [
    { title: 'Responsable du traitement', paragraphs: ['Tamurt Services LLC, [adresse à compléter]. Contact données personnelles : [adresse e-mail à compléter].'] },
    { title: 'Données traitées', paragraphs: ['Compte : adresse e-mail, nom affiché, langue, pays, ville et fuseau facultatifs. Activité : favoris, inscriptions, agenda, commandes et billets (fictifs en démonstration), annonces de revente, signalements, retours bêta. Organisateurs : informations publiques de l’organisation et éléments transmis pour la vérification. Technique : journaux de sécurité, limitation de débit, jetons de notification push si vous les autorisez.', 'Aucune donnée de carte bancaire n’est collectée ni stockée par Tamurt. La position n’est utilisée qu’à votre demande pour une recherche « autour de moi » et n’est pas enregistrée.'] },
    { title: 'Finalités et bases légales', paragraphs: ['Fournir le service (exécution du contrat), sécuriser la plateforme et prévenir la fraude (intérêt légitime), envoyer des notifications et e-mails que vous avez choisis (consentement, révocable à tout moment), respecter nos obligations légales. Aucune publicité ciblée, aucune revente de données.'] },
    { title: 'Destinataires et hébergement', paragraphs: ['Sous-traitants techniques : hébergement du site [Vercel Inc.], base de données et authentification [Supabase Inc.], envoi d’e-mails [prestataire SMTP à préciser], notifications push [Expo / Apple / Google]. Des transferts hors de l’Union européenne peuvent avoir lieu : [garanties à préciser, par ex. clauses contractuelles types].'] },
    { title: 'Durées de conservation', paragraphs: ['Compte : jusqu’à sa suppression. Commandes : durée légale de conservation comptable [à préciser]. Journaux de sécurité et d’audit : [durée à préciser]. Liste d’attente bêta : jusqu’à la fin du programme ou désinscription.'] },
    { title: 'Vos droits', paragraphs: ['Accès, rectification, effacement (suppression du compte depuis Paramètres), opposition, limitation, portabilité ; réclamation auprès de l’autorité compétente (CNIL en France ; ANPDP en Algérie ; autorités fédérales/provinciales au Canada ; droits des résidents de Californie). [Procédure de demande à préciser.]'] },
  ],
  cookies: [
    { title: 'Cookies utilisés', paragraphs: ['Tamurt n’utilise que des cookies nécessaires au fonctionnement du service : cookies de session d’authentification (sb-…), langue de l’interface (TAMURT_LOCALE), thème clair/sombre (TAMURT_THEME) et pays de navigation (TAMURT_COUNTRY).', 'Aucun cookie publicitaire ni de mesure d’audience tierce n’est déposé. Les statistiques de vues des événements sont agrégées côté serveur, sans profilage.'] },
    { title: 'Gestion', paragraphs: ['Vous pouvez supprimer ces cookies depuis votre navigateur ; la suppression des cookies de session entraîne votre déconnexion.'] },
  ],
  notice: [
    { title: 'Éditeur', paragraphs: ['Tamurt Services LLC — [forme juridique, État d’enregistrement, numéro d’enregistrement, adresse du siège, directeur de la publication, contact : à compléter].'] },
    { title: 'Hébergement', paragraphs: ['[Hébergeur du site et de la base de données : raison sociale, adresse et contact à compléter selon la configuration de production.]'] },
    { title: 'Propriété intellectuelle', paragraphs: ['La marque, le logo et l’identité visuelle Tamurt Events appartiennent à Tamurt Services LLC. Les contenus publiés par les organisateurs restent sous leur responsabilité. Les noms de partenaires éventuels ne sont mentionnés qu’à titre informatif et n’impliquent aucun partenariat sans accord signé.'] },
  ],
};

const en: Library = {
  terms: [
    { title: 'Purpose', paragraphs: ['Tamurt Events, published by Tamurt Services LLC, is a platform to discover, create and book events in France, Algeria, the United States and Canada. These terms govern the use of the website and mobile apps.'] },
    { title: 'Demo and beta phase', paragraphs: ['The platform currently runs in demonstration mode. Events, organizers, venues, tickets and payments marked “Demo” are fictitious: no real ticket is sold, no real payment is collected, and demo tickets grant access to no event.', 'Some features are reserved for invited beta testers. The service is provided “as is” during the beta and may change or be interrupted.'] },
    { title: 'Accounts', paragraphs: ['Users provide accurate information, keep their credentials safe and remain responsible for their account. Tamurt may suspend an account in case of abuse, fraud or breach of these terms.'] },
    { title: 'Publishing events', paragraphs: ['Publishing is free. Organizers guarantee that published information is accurate and that they hold the rights to the texts and images they share, and only mention artists who are actually booked. Events from unverified organizations are reviewed before publication.'] },
    { title: 'Ticketing and resale', paragraphs: ['Real ticket sales will only be offered with ticketing partners that have signed an agreement with Tamurt; the partner’s terms will then apply. Peer-to-peer resale is only possible for tickets issued through Tamurt, at a capped price, with the ticket reissued to the buyer, and only where the applicable law allows it. A PDF or QR code supplied by a user does not prove that a ticket is authentic.'] },
    { title: 'Reports and moderation', paragraphs: ['Any user can report suspicious content or listings. Moderators may remove content, refuse a publication or suspend an account. Decisions are logged.'] },
    { title: 'Liability', paragraphs: ['[Liability, warranty and limitation clauses to be drafted and validated by counsel for each country.]'] },
    { title: 'Governing law and contact', paragraphs: ['[Governing law, jurisdiction and consumer mediation to be defined.] Contact: [support email address].'] },
  ],
  privacy: [
    { title: 'Controller', paragraphs: ['Tamurt Services LLC, [address to be completed]. Privacy contact: [email to be completed].'] },
    { title: 'Data we process', paragraphs: ['Account: email address, display name, language, optional country, city and time zone. Activity: favorites, registrations, agenda, orders and tickets (fictitious in demo mode), resale listings, reports, beta feedback. Organizers: public organization details and information submitted for verification. Technical: security logs, rate limiting, push tokens if you allow them.', 'Tamurt never collects or stores payment card data. Your location is only used when you ask for a “near me” search and is not stored.'] },
    { title: 'Purposes and legal bases', paragraphs: ['Providing the service (contract), securing the platform and preventing fraud (legitimate interest), sending the notifications and emails you opted into (consent, revocable at any time), complying with legal obligations. No targeted advertising, no sale of personal data.'] },
    { title: 'Recipients and hosting', paragraphs: ['Processors: website hosting [Vercel Inc.], database and authentication [Supabase Inc.], email delivery [SMTP provider to be specified], push notifications [Expo / Apple / Google]. Data may be transferred outside the European Union: [safeguards to be specified, e.g. standard contractual clauses].'] },
    { title: 'Retention', paragraphs: ['Account: until deletion. Orders: statutory accounting period [to be specified]. Security and audit logs: [period to be specified]. Beta waitlist: until the end of the program or unsubscription.'] },
    { title: 'Your rights', paragraphs: ['Access, rectification, erasure (delete your account from Settings), objection, restriction, portability; complaints to the competent authority (CNIL in France; ANPDP in Algeria; federal/provincial authorities in Canada; California residents’ rights). [Request procedure to be specified.]'] },
  ],
  cookies: [
    { title: 'Cookies we use', paragraphs: ['Tamurt only uses cookies required for the service: authentication session cookies (sb-…), interface language (TAMURT_LOCALE), light/dark theme (TAMURT_THEME) and browsing country (TAMURT_COUNTRY).', 'No advertising or third-party analytics cookies are set. Event view statistics are aggregated server-side, without profiling.'] },
    { title: 'Managing cookies', paragraphs: ['You can delete these cookies in your browser; deleting session cookies signs you out.'] },
  ],
  notice: [
    { title: 'Publisher', paragraphs: ['Tamurt Services LLC — [legal form, state of registration, registration number, registered address, publication director, contact: to be completed].'] },
    { title: 'Hosting', paragraphs: ['[Website and database host: company name, address and contact to be completed for the production setup.]'] },
    { title: 'Intellectual property', paragraphs: ['The Tamurt Events name, logo and visual identity belong to Tamurt Services LLC. Content published by organizers remains their responsibility. Names of potential partners are mentioned for information only and imply no partnership without a signed agreement.'] },
  ],
};

export function legalContent(locale: string, doc: LegalDoc): { lang: 'fr' | 'en'; sections: Section[] } {
  return locale === 'en' ? { lang: 'en', sections: en[doc] } : { lang: 'fr', sections: fr[doc] };
}

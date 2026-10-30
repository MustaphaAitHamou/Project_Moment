/**
 * Contenu de DÉMONSTRATION entièrement fictif. Aucun artiste, organisateur, lieu ou événement réel
 * n'est utilisé ; les noms comportent la mention « démo » et tout est marqué is_demo en base.
 * Les adresses sont imaginaires (rues inventées) ; seules les villes et leurs coordonnées
 * approximatives de centre-ville sont réelles.
 */

export const DEMO_EMAIL_DOMAIN = 'tamurt-demo.example';
export const DEMO_PASSWORD = 'Demo-Tamurt-2026';

export interface DemoAccount {
  key: string;
  displayName: string;
  roles: ('admin' | 'moderator' | 'organizer' | 'beta_tester')[];
  locale: 'fr' | 'en' | 'ar';
  country: 'FR' | 'DZ' | 'US' | 'CA';
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { key: 'admin', displayName: 'Admin Démo', roles: ['admin', 'beta_tester'], locale: 'fr', country: 'FR' },
  { key: 'moderateur', displayName: 'Modération Démo', roles: ['moderator', 'beta_tester'], locale: 'fr', country: 'DZ' },
  { key: 'organisateur', displayName: 'Organisateur Démo', roles: ['beta_tester'], locale: 'fr', country: 'FR' },
  { key: 'association', displayName: 'Association Démo', roles: ['beta_tester'], locale: 'fr', country: 'DZ' },
  { key: 'testeur', displayName: 'Testeur Bêta Démo', roles: ['beta_tester'], locale: 'fr', country: 'FR' },
  { key: 'acheteur', displayName: 'Acheteur Démo', roles: ['beta_tester'], locale: 'en', country: 'CA' },
  { key: 'visiteur', displayName: 'Utilisateur sans accès bêta', roles: [], locale: 'fr', country: 'FR' },
];

export interface DemoOrganizer {
  key: string;
  owner: string;
  name: string;
  kind: 'individual' | 'association' | 'professional';
  country: 'FR' | 'DZ' | 'US' | 'CA';
  verified: boolean;
  bio: string;
}

export const DEMO_ORGANIZERS: DemoOrganizer[] = [
  { key: 'ondes', owner: 'organisateur', name: 'Ondes Nomades (démo)', kind: 'professional', country: 'FR', verified: true, bio: 'Organisateur fictif de concerts et festivals, créé pour la démonstration de Tamurt Events.' },
  { key: 'azur', owner: 'organisateur', name: 'Maison Azur Événements (démo)', kind: 'professional', country: 'FR', verified: true, bio: 'Société fictive de spectacles et de conférences (démonstration).' },
  { key: 'lanternes', owner: 'association', name: 'Association Les Lanternes (démo)', kind: 'association', country: 'DZ', verified: true, bio: 'Association culturelle fictive organisant des événements en Algérie (démonstration).' },
  { key: 'quartier', owner: 'association', name: 'Comité de quartier Les Figuiers (démo)', kind: 'association', country: 'DZ', verified: false, bio: 'Association fictive non vérifiée : ses événements passent par la modération.' },
  { key: 'harbor', owner: 'organisateur', name: 'Harbor & Pine Live (demo)', kind: 'professional', country: 'US', verified: true, bio: 'Fictitious North American promoter created for the Tamurt Events demo.' },
  { key: 'kaleido', owner: 'organisateur', name: 'Studio Kaleido (démo)', kind: 'professional', country: 'CA', verified: true, bio: 'Studio fictif de spectacles au Canada (démonstration).' },
  { key: 'camille', owner: 'testeur', name: 'Camille R. (démo)', kind: 'individual', country: 'FR', verified: false, bio: 'Particulier fictif organisant des ateliers (démonstration).' },
];

export interface DemoVenue {
  key: string;
  city: string;
  name: string;
  address: string;
  postalCode: string;
  dLat: number;
  dLng: number;
  capacity: number;
  description: string;
}

export const DEMO_VENUES: DemoVenue[] = [
  { key: 'horizon', city: 'paris', name: 'Salle Horizon (démo)', address: '12 rue Imaginaire', postalCode: '75011', dLat: 0.004, dLng: 0.021, capacity: 1200, description: 'Salle de concert fictive de 1 200 places.' },
  { key: 'jardins', city: 'paris', name: 'Jardins Suspendus (démo)', address: '3 allée des Songes', postalCode: '75019', dLat: 0.028, dLng: 0.031, capacity: 8000, description: 'Parc fictif accueillant des festivals en plein air.' },
  { key: 'docks', city: 'marseille', name: 'Docks Imaginaires (démo)', address: '45 quai des Rêves', postalCode: '13002', dLat: 0.012, dLng: -0.006, capacity: 2500, description: 'Ancien entrepôt fictif reconverti en salle de spectacle.' },
  { key: 'saules', city: 'lyon', name: 'Théâtre des Saules (démo)', address: '8 place des Saules', postalCode: '69002', dLat: -0.006, dLng: -0.004, capacity: 600, description: 'Théâtre à l’italienne fictif.' },
  { key: 'baie', city: 'nice', name: 'Kiosque de la Baie (démo)', address: '1 promenade Fictive', postalCode: '06000', dLat: -0.015, dLng: -0.01, capacity: 900, description: 'Scène fictive en bord de mer.' },
  { key: 'cedre', city: 'alger', name: 'Espace Cèdre (démo)', address: '27 boulevard des Palmiers Fictifs', postalCode: '16000', dLat: 0.003, dLng: 0.01, capacity: 1500, description: 'Centre culturel fictif.' },
  { key: 'oliviers', city: 'tizi-ouzou', name: 'Agora des Oliviers (démo)', address: '5 rue de la Colline', postalCode: '15000', dLat: 0.002, dLng: -0.006, capacity: 2000, description: 'Esplanade fictive pour festivals.' },
  { key: 'port', city: 'bejaia', name: 'Scène du Port (démo)', address: '9 rue du Phare Imaginaire', postalCode: '06000', dLat: -0.004, dLng: 0.008, capacity: 1000, description: 'Scène fictive face à la mer.' },
  { key: 'pavillon', city: 'oran', name: 'Pavillon Méditerranée (démo)', address: '14 avenue des Embruns', postalCode: '31000', dLat: 0.006, dLng: 0.004, capacity: 3000, description: 'Pavillon fictif de concerts.' },
  { key: 'rotonde', city: 'constantine', name: 'Rotonde des Ponts (démo)', address: '2 rue des Gorges Fictives', postalCode: '25000', dLat: 0.002, dLng: -0.003, capacity: 700, description: 'Salle fictive de musique et de théâtre.' },
  { key: 'lantern', city: 'new-york', name: 'Hudson Lantern Hall (demo)', address: '210 Imaginary Street', postalCode: '10013', dLat: 0.012, dLng: -0.002, capacity: 1800, description: 'Fictitious rooftop concert hall.' },
  { key: 'coral', city: 'miami', name: 'Coral Dome (demo)', address: '77 Ocean Fiction Drive', postalCode: '33139', dLat: 0.02, dLng: 0.05, capacity: 2200, description: 'Fictitious waterfront arena.' },
  { key: 'atrium', city: 'los-angeles', name: 'Sunset Atrium (demo)', address: '500 Make-Believe Blvd', postalCode: '90028', dLat: 0.045, dLng: -0.08, capacity: 900, description: 'Fictitious comedy and film venue.' },
  { key: 'erable', city: 'montreal', name: 'Salle Érable (démo)', address: '300 rue des Songes', postalCode: 'H2X 1Y4', dLat: 0.007, dLng: 0.002, capacity: 850, description: 'Salle fictive de spectacles.' },
  { key: 'lakeside', city: 'toronto', name: 'Lakeside Forum (demo)', address: '15 Harbourfront Fiction Way', postalCode: 'M5J 2H7', dLat: -0.012, dLng: 0.002, capacity: 2600, description: 'Fictitious concert hall by the lake.' },
  { key: 'bytown', city: 'ottawa', name: 'Bytown Loft (demo)', address: '88 Imaginary Lane', postalCode: 'K1N 5W8', dLat: 0.006, dLng: 0.003, capacity: 500, description: 'Fictitious community venue.' },
];

export const DEMO_ARTISTS = [
  'Orchestre Céleste (démo)',
  'Duo Marées (démo)',
  'Kamel & Les Comètes (démo)',
  'Velvet Harbor (demo)',
  'Sahara Lights Ensemble (démo)',
  'Trio Mistral (démo)',
  'Lina Sorel (démo)',
  'The Neon Orchards (demo)',
  'Compagnie du Fil Rouge (démo)',
  'Nadia K. & Friends (demo)',
];

export interface DemoOffer {
  name: string;
  price: number; // unités majeures (euros, dinars…)
  fee: number;
  capacity: number;
  maxPerOrder?: number;
}

export interface DemoEvent {
  key: string;
  organizer: string;
  venue: string | null;
  city: string;
  category: string;
  title: string;
  summary: string;
  description: string;
  /** Jours à partir d'aujourd'hui (date locale). */
  day: number | 'today' | 'weekend';
  time: string;
  durationHours: number;
  endDay?: number;
  mode: 'none' | 'free_registration' | 'tickets';
  isFree: boolean;
  capacity?: number;
  offers?: DemoOffer[];
  status?: 'published' | 'pending_review' | 'rejected' | 'cancelled' | 'archived';
  sponsored?: boolean;
  artists?: string[];
  tags?: string[];
  accessibility?: Record<string, boolean | string>;
  sessions?: number[];
  ageMin?: number;
  cancellationReason?: string;
  moderationNote?: string;
}

const desc = (text: string) =>
  `${text}\n\nCet événement est FICTIF : il a été créé pour la démonstration de Tamurt Events et n'aura pas lieu.`;
const descEn = (text: string) =>
  `${text}\n\nThis event is FICTITIOUS: it was created for the Tamurt Events demo and will not take place.`;

export const DEMO_EVENTS: DemoEvent[] = [
  // ---- France ----
  { key: 'electro-lumiere', organizer: 'ondes', venue: 'horizon', city: 'paris', category: 'concerts', title: 'Nuit Électro Lumière', summary: 'Une nuit de musique électronique et de lumières.', description: desc('Quatre artistes fictifs, une scénographie lumineuse immersive et un son spatialisé.'), day: 5, time: '21:00', durationHours: 5, mode: 'tickets', isFree: false, offers: [{ name: 'Fosse', price: 35, fee: 1.5, capacity: 400 }, { name: 'Balcon', price: 45, fee: 1.5, capacity: 120 }, { name: 'Dernières places', price: 29, fee: 1.5, capacity: 6, maxPerOrder: 2 }], artists: ['Velvet Harbor (demo)', 'Lina Sorel (démo)'], tags: ['électro', 'nuit'], accessibility: { wheelchair: true, accessibleToilets: true } },
  { key: 'jardins-suspendus', organizer: 'ondes', venue: 'jardins', city: 'paris', category: 'festivals', title: 'Festival des Jardins Suspendus', summary: 'Trois jours de musique, d’arts et de gastronomie en plein air.', description: desc('Programmation fictive : concerts acoustiques, installations artistiques, ateliers pour enfants et food trucks.'), day: 20, endDay: 22, time: '14:00', durationHours: 10, mode: 'tickets', isFree: false, offers: [{ name: 'Pass 1 jour', price: 29, fee: 1, capacity: 3000 }, { name: 'Pass 3 jours', price: 69, fee: 2, capacity: 1500 }], sponsored: true, artists: ['Orchestre Céleste (démo)', 'Trio Mistral (démo)', 'Duo Marées (démo)'], tags: ['plein air', 'famille'], accessibility: { wheelchair: true, quietSpace: true } },
  { key: 'rires-minuit', organizer: 'azur', venue: 'horizon', city: 'paris', category: 'comedy', title: 'Stand-up : Rires de Minuit', summary: 'Plateau d’humoristes fictifs pour finir la semaine en riant.', description: desc('Cinq humoristes imaginaires se succèdent sur scène pendant deux heures.'), day: 'weekend', time: '22:00', durationHours: 2, mode: 'tickets', isFree: false, offers: [{ name: 'Placement libre', price: 22, fee: 1, capacity: 250 }], ageMin: 16, tags: ['humour'] },
  { key: 'villes-durables', organizer: 'azur', venue: null, city: 'paris', category: 'conferences', title: 'Conférence : Villes durables 2030', summary: 'Urbanisme, mobilité et énergie : quelles villes demain ?', description: desc('Table ronde fictive réunissant des intervenants imaginaires.'), day: 9, time: '18:30', durationHours: 2, mode: 'free_registration', isFree: true, capacity: 120, tags: ['urbanisme', 'climat'], accessibility: { wheelchair: true, hearingLoop: true } },
  { key: 'lumieres-geometriques', organizer: 'azur', venue: null, city: 'paris', category: 'exhibitions', title: 'Exposition : Lumières Géométriques', summary: 'Installations lumineuses autour du losange et du cercle.', description: desc('Parcours d’œuvres numériques fictives, accessible en continu.'), day: 1, endDay: 40, time: '10:00', durationHours: 8, mode: 'none', isFree: true, tags: ['art numérique'] },
  { key: 'brunch-famille', organizer: 'camille', venue: null, city: 'paris', category: 'family', title: 'Brunch musical en famille', summary: 'Comptines revisitées et éveil musical pour les 3-8 ans.', description: desc('Atelier fictif animé par une musicienne imaginaire.'), day: 'weekend', time: '11:00', durationHours: 2, mode: 'free_registration', isFree: true, capacity: 30, tags: ['enfants'] },
  { key: 'afterwork-musical', organizer: 'ondes', venue: 'horizon', city: 'paris', category: 'concerts', title: 'Afterwork musical', summary: 'Concert acoustique en fin de journée.', description: desc('Un trio fictif joue des reprises jazz et soul.'), day: 'today', time: '19:30', durationHours: 2, mode: 'tickets', isFree: false, offers: [{ name: 'Entrée', price: 12, fee: 0.5, capacity: 80 }], artists: ['Trio Mistral (démo)'] },
  { key: 'duo-marees-annule', organizer: 'ondes', venue: 'horizon', city: 'paris', category: 'concerts', title: 'Concert : Duo Marées', summary: 'Concert annulé (exemple de démonstration).', description: desc('Exemple d’événement annulé : les participants et favoris sont notifiés.'), day: 14, time: '20:00', durationHours: 2, mode: 'none', isFree: false, status: 'cancelled', cancellationReason: 'Exemple d’annulation pour la démonstration.', artists: ['Duo Marées (démo)'] },
  { key: 'coucher-soleil', organizer: 'ondes', venue: 'docks', city: 'marseille', category: 'concerts', title: 'Concert au coucher du soleil', summary: 'Pop méditerranéenne sur les docks.', description: desc('Un concert fictif face à la mer.'), day: 12, time: '20:00', durationHours: 3, mode: 'tickets', isFree: false, offers: [{ name: 'Debout', price: 25, fee: 1, capacity: 800 }, { name: 'Assis', price: 38, fee: 1, capacity: 200 }], artists: ['Kamel & Les Comètes (démo)'] },
  { key: 'artisanat-med', organizer: 'azur', venue: 'docks', city: 'marseille', category: 'fairs', title: 'Salon de l’artisanat méditerranéen', summary: 'Créateurs, artisans et démonstrations.', description: desc('Salon fictif réunissant des exposants imaginaires.'), day: 15, endDay: 17, time: '10:00', durationHours: 8, mode: 'none', isFree: true, tags: ['artisanat'] },
  { key: 'maison-echos', organizer: 'azur', venue: 'saules', city: 'lyon', category: 'theatre', title: 'Théâtre : La Maison des Échos', summary: 'Une comédie dramatique en deux actes.', description: desc('Pièce fictive jouée par la Compagnie du Fil Rouge (démo).'), day: 7, time: '20:30', durationHours: 2, mode: 'tickets', isFree: false, offers: [{ name: 'Tarif plein', price: 28, fee: 1, capacity: 300 }, { name: 'Tarif réduit', price: 18, fee: 1, capacity: 100 }], artists: ['Compagnie du Fil Rouge (démo)'], sessions: [8, 9] },
  { key: 'course-berges', organizer: 'camille', venue: null, city: 'lyon', category: 'sports', title: 'Course solidaire des Berges', summary: 'Course de 5 et 10 km au profit d’une cause fictive.', description: desc('Parcours imaginaire le long des quais.'), day: 25, time: '09:00', durationHours: 3, mode: 'free_registration', isFree: true, capacity: 300, tags: ['course', 'solidarité'] },
  { key: 'cine-plage', organizer: 'azur', venue: 'baie', city: 'nice', category: 'culture', title: 'Ciné-concert sur la plage', summary: 'Un film muet accompagné en direct par un orchestre.', description: desc('Projection fictive en plein air.'), day: 30, time: '21:00', durationHours: 2, mode: 'tickets', isFree: false, offers: [{ name: 'Transat', price: 15, fee: 0.5, capacity: 400 }], artists: ['Orchestre Céleste (démo)'] },
  { key: 'jazz-port-passe', organizer: 'ondes', venue: 'baie', city: 'nice', category: 'concerts', title: 'Jazz du Port', summary: 'Événement passé (archivé).', description: desc('Exemple d’événement terminé, conservé dans l’historique de la salle.'), day: -12, time: '20:00', durationHours: 3, mode: 'none', isFree: false, status: 'archived', artists: ['Trio Mistral (démo)'] },
  // ---- Algérie ----
  { key: 'soiree-chaabi', organizer: 'lanternes', venue: 'cedre', city: 'alger', category: 'concerts', title: 'Soirée chaâbi', summary: 'Grande soirée de musique chaâbi avec un orchestre fictif.', description: desc('Orchestre imaginaire et invités surprises (fictifs).'), day: 6, time: '20:30', durationHours: 3, mode: 'tickets', isFree: false, offers: [{ name: 'Parterre', price: 1500, fee: 50, capacity: 600 }, { name: 'Carré VIP', price: 2500, fee: 100, capacity: 80 }], artists: ['Sahara Lights Ensemble (démo)'] },
  { key: 'livre-jeunesse', organizer: 'lanternes', venue: 'cedre', city: 'alger', category: 'fairs', title: 'Salon du livre jeunesse', summary: 'Rencontres, lectures et ateliers d’écriture.', description: desc('Salon fictif pour les jeunes lecteurs.'), day: 18, endDay: 20, time: '10:00', durationHours: 7, mode: 'none', isFree: true, tags: ['lecture', 'enfants'] },
  { key: 'startups-alger', organizer: 'lanternes', venue: null, city: 'alger', category: 'conferences', title: 'Conférence : Numérique et startups', summary: 'Retours d’expérience d’entrepreneurs (fictifs).', description: desc('Conférence fictive suivie d’un temps d’échange.'), day: 11, time: '17:00', durationHours: 2, mode: 'free_registration', isFree: true, capacity: 150 },
  { key: 'festival-montagnes', organizer: 'lanternes', venue: 'oliviers', city: 'tizi-ouzou', category: 'festivals', title: 'Festival des montagnes', summary: 'Musiques, danses et artisanat de montagne.', description: desc('Festival fictif sur trois jours.'), day: 27, endDay: 29, time: '15:00', durationHours: 8, mode: 'tickets', isFree: false, offers: [{ name: 'Pass journée', price: 1000, fee: 50, capacity: 2000 }, { name: 'Pass 3 jours', price: 2500, fee: 100, capacity: 800 }], artists: ['Sahara Lights Ensemble (démo)', 'Kamel & Les Comètes (démo)'] },
  { key: 'fete-oliviers', organizer: 'quartier', venue: null, city: 'tizi-ouzou', category: 'culture', title: 'Fête des oliviers', summary: 'Fête de quartier en attente de modération.', description: desc('Exemple d’événement soumis par une association non vérifiée.'), day: 33, time: '14:00', durationHours: 5, mode: 'none', isFree: true, status: 'pending_review' },
  { key: 'concert-mer', organizer: 'lanternes', venue: 'port', city: 'bejaia', category: 'concerts', title: 'Concert face à la mer', summary: 'Soirée musicale sur le port.', description: desc('Concert fictif en plein air.'), day: 13, time: '21:00', durationHours: 3, mode: 'tickets', isFree: false, offers: [{ name: 'Entrée générale', price: 2000, fee: 50, capacity: 900 }], artists: ['Duo Marées (démo)'] },
  { key: 'rando-littoral', organizer: 'quartier', venue: null, city: 'bejaia', category: 'sports', title: 'Randonnée découverte du littoral', summary: 'Randonnée accompagnée (exemple refusé par la modération).', description: desc('Exemple d’événement refusé : informations insuffisantes.'), day: 16, time: '08:00', durationHours: 5, mode: 'free_registration', isFree: true, capacity: 40, status: 'rejected', moderationNote: 'Exemple de démonstration : merci de préciser le point de rendez-vous.' },
  { key: 'nuit-rai', organizer: 'lanternes', venue: 'pavillon', city: 'oran', category: 'concerts', title: 'Nuit du raï', summary: 'Grande nuit raï avec des artistes fictifs.', description: desc('Concert fictif.'), day: 'weekend', time: '22:00', durationHours: 4, mode: 'tickets', isFree: false, offers: [{ name: 'Fosse', price: 2500, fee: 100, capacity: 2500 }], artists: ['Nadia K. & Friends (demo)'] },
  { key: 'photo-oran', organizer: 'lanternes', venue: 'pavillon', city: 'oran', category: 'exhibitions', title: 'Exposition photo : Lumières de la ville', summary: 'Photographies de lumière urbaine (œuvres fictives).', description: desc('Exposition fictive.'), day: 2, endDay: 30, time: '10:00', durationHours: 8, mode: 'none', isFree: true },
  { key: 'malouf', organizer: 'lanternes', venue: 'rotonde', city: 'constantine', category: 'concerts', title: 'Concert de malouf', summary: 'Répertoire andalou par un ensemble fictif.', description: desc('Concert fictif.'), day: 10, time: '20:00', durationHours: 2, mode: 'tickets', isFree: false, offers: [{ name: 'Orchestre', price: 1500, fee: 50, capacity: 400 }, { name: 'Balcon', price: 1000, fee: 50, capacity: 200 }] },
  { key: 'theatre-ponts', organizer: 'lanternes', venue: 'rotonde', city: 'constantine', category: 'theatre', title: 'Théâtre des ponts', summary: 'Pièce fictive en arabe et en français.', description: desc('Spectacle fictif.'), day: 19, time: '19:00', durationHours: 2, mode: 'tickets', isFree: false, offers: [{ name: 'Placement libre', price: 800, fee: 0, capacity: 600 }], artists: ['Compagnie du Fil Rouge (démo)'] },
  // ---- États-Unis ----
  { key: 'rooftop-jazz', organizer: 'harbor', venue: 'lantern', city: 'new-york', category: 'concerts', title: 'Rooftop Jazz Session', summary: 'Jazz above the city skyline.', description: descEn('An evening of jazz by fictitious musicians.'), day: 8, time: '19:30', durationHours: 3, mode: 'tickets', isFree: false, offers: [{ name: 'General admission', price: 45, fee: 4, capacity: 500 }, { name: 'Lounge', price: 65, fee: 5, capacity: 80 }], artists: ['Velvet Harbor (demo)', 'The Neon Orchards (demo)'] },
  { key: 'tech-futures', organizer: 'harbor', venue: 'lantern', city: 'new-york', category: 'conferences', title: 'Tech Futures Summit', summary: 'Talks on AI, cities and climate tech.', description: descEn('A fictitious one-day summit.'), day: 23, time: '09:00', durationHours: 8, mode: 'tickets', isFree: false, offers: [{ name: 'Standard pass', price: 120, fee: 8, capacity: 600 }], sponsored: true },
  { key: 'family-science', organizer: 'harbor', venue: null, city: 'new-york', category: 'family', title: 'Family Science Day', summary: 'Hands-on experiments for kids.', description: descEn('Fictitious workshops for families.'), day: 'weekend', time: '10:00', durationHours: 5, mode: 'free_registration', isFree: true, capacity: 200 },
  { key: 'latin-beats', organizer: 'harbor', venue: 'coral', city: 'miami', category: 'concerts', title: 'Latin Beats Night', summary: 'Salsa, reggaeton and Latin pop.', description: descEn('Fictitious concert.'), day: 4, time: '21:00', durationHours: 4, mode: 'tickets', isFree: false, offers: [{ name: 'Floor', price: 35, fee: 3, capacity: 1500 }] },
  { key: 'art-ocean', organizer: 'harbor', venue: 'coral', city: 'miami', category: 'exhibitions', title: 'Art by the Ocean', summary: 'Open-air exhibition of fictional artists.', description: descEn('Fictitious exhibition.'), day: 3, endDay: 24, time: '11:00', durationHours: 7, mode: 'none', isFree: true },
  { key: 'sunset-comedy', organizer: 'harbor', venue: 'atrium', city: 'los-angeles', category: 'comedy', title: 'Sunset Comedy Hour', summary: 'Stand-up with fictional comedians.', description: descEn('Fictitious comedy show.'), day: 6, time: '20:00', durationHours: 2, mode: 'tickets', isFree: false, offers: [{ name: 'Seat', price: 25, fee: 3, capacity: 300 }], ageMin: 18 },
  { key: 'indie-film', organizer: 'harbor', venue: 'atrium', city: 'los-angeles', category: 'culture', title: 'Indie Film Marathon', summary: 'Twelve hours of short films.', description: descEn('Fictitious film marathon.'), day: 17, time: '12:00', durationHours: 12, mode: 'tickets', isFree: false, offers: [{ name: 'Day pass', price: 18, fee: 2, capacity: 400 }] },
  // ---- Canada ----
  { key: 'humour-mtl', organizer: 'kaleido', venue: 'erable', city: 'montreal', category: 'comedy', title: 'Soirée d’humour', summary: 'Humoristes fictifs en français.', description: desc('Spectacle fictif.'), day: 9, time: '20:00', durationHours: 2, mode: 'tickets', isFree: false, offers: [{ name: 'Admission générale', price: 30, fee: 3, capacity: 700 }] },
  { key: 'lanternes-hiver', organizer: 'kaleido', venue: null, city: 'montreal', category: 'festivals', title: 'Festival des lanternes d’hiver', summary: 'Parcours illuminé en plein air.', description: desc('Festival fictif.'), day: 35, endDay: 50, time: '17:00', durationHours: 5, mode: 'none', isFree: true },
  { key: 'lakeside-symphony', organizer: 'kaleido', venue: 'lakeside', city: 'toronto', category: 'concerts', title: 'Lakeside Symphony Night', summary: 'Classical favourites by a fictional orchestra.', description: descEn('Fictitious symphonic concert.'), day: 11, time: '19:30', durationHours: 3, mode: 'tickets', isFree: false, offers: [{ name: 'Orchestra', price: 85, fee: 5, capacity: 900 }, { name: 'Balcony', price: 55, fee: 4, capacity: 600 }], artists: ['Orchestre Céleste (démo)'] },
  { key: 'pitch-evening', organizer: 'kaleido', venue: null, city: 'toronto', category: 'conferences', title: 'Startup Pitch Evening', summary: 'Ten fictional startups pitch their ideas.', description: descEn('Fictitious event.'), day: 13, time: '18:00', durationHours: 3, mode: 'free_registration', isFree: true, capacity: 120 },
  { key: 'winter-market', organizer: 'kaleido', venue: 'bytown', city: 'ottawa', category: 'fairs', title: 'Winter Market Fair', summary: 'Local makers and seasonal food (fictional).', description: descEn('Fictitious market.'), day: 21, endDay: 23, time: '10:00', durationHours: 7, mode: 'none', isFree: true },
  { key: 'hockey-day', organizer: 'kaleido', venue: null, city: 'ottawa', category: 'sports', title: 'Community Hockey Day', summary: 'Friendly games for all ages.', description: descEn('Fictitious community event.'), day: 26, time: '10:00', durationHours: 6, mode: 'free_registration', isFree: true, capacity: 150 },
];

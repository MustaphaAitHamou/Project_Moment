/**
 * Capacités qu'un connecteur de billetterie peut déclarer. Aucune capacité n'est supposée :
 * chaque connecteur déclare explicitement ce que l'API réelle du partenaire permet.
 */
export const TICKETING_CAPABILITIES = [
  'catalog.events',
  'catalog.pricing',
  'inventory.categories',
  'inventory.availability',
  'inventory.hold',
  'cart',
  'checkout.provider_payment',
  'checkout.distributor_payment',
  'order.confirm',
  'order.status',
  'delivery.retrieve',
  'refund',
  'webhooks',
  'ticket.transfer',
  'ticket.ownership_verification',
] as const;

export type TicketingCapability = (typeof TICKETING_CAPABILITIES)[number];

export type CapabilitySet = Readonly<Record<TicketingCapability, boolean>>;

/** Description (FR) de chaque capacité, affichée dans l'administration et la documentation. */
export const CAPABILITY_DESCRIPTIONS: Record<TicketingCapability, string> = {
  'catalog.events': 'Liste des événements commercialisables',
  'catalog.pricing': 'Consultation des tarifs',
  'inventory.categories': 'Récupération des catégories de billets',
  'inventory.availability': 'Vérification des disponibilités',
  'inventory.hold': 'Réservation temporaire des places',
  cart: 'Panier multi-lignes chez le fournisseur',
  'checkout.provider_payment': 'Paiement transmis de façon sécurisée au prestataire',
  'checkout.distributor_payment': 'Paiement encaissé par le distributeur puis confirmation',
  'order.confirm': 'Confirmation de commande',
  'order.status': 'Suivi des commandes',
  'delivery.retrieve': 'Récupération des informations de livraison des billets',
  refund: 'Remboursements autorisés',
  webhooks: 'Événements de synchronisation (webhooks signés)',
  'ticket.transfer': 'Transfert / réémission sécurisée d’un billet (revente)',
  'ticket.ownership_verification': 'Vérification de la propriété d’un billet',
};

export function declareCapabilities(enabled: readonly TicketingCapability[]): CapabilitySet {
  const set = Object.fromEntries(TICKETING_CAPABILITIES.map((c) => [c, false])) as Record<TicketingCapability, boolean>;
  for (const capability of enabled) set[capability] = true;
  return Object.freeze(set);
}

export function enabledCapabilities(set: CapabilitySet): TicketingCapability[] {
  return TICKETING_CAPABILITIES.filter((c) => set[c]);
}

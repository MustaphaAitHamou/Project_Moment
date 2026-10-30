import { declareCapabilities, type CapabilitySet } from './capabilities';
import type { TicketingConnector } from './connector';
import type { ConnectorInfo } from './types';

/**
 * Partenaires de billetterie ENVISAGÉS. Aucun accord n'est signé : ces entrées servent uniquement
 * au suivi commercial dans l'administration. Aucune capacité n'est déclarée et aucun appel réseau
 * n'est implémenté — un connecteur réel ne sera écrit qu'avec un contrat, une documentation
 * d'API officielle et des identifiants fournis par le partenaire (voir docs/API_INTEGRATIONS.md).
 */
export interface PlannedPartner {
  id: string;
  displayName: string;
  markets: string[];
  contractStatus: 'no_agreement';
  notes: string;
}

export const PLANNED_PARTNERS: readonly PlannedPartner[] = [
  { id: 'ticketmaster', displayName: 'Ticketmaster', markets: ['FR', 'US', 'CA'], contractStatus: 'no_agreement', notes: 'Contrat de distribution et accès API partenaire à obtenir.' },
  { id: 'france_billet', displayName: 'France Billet', markets: ['FR'], contractStatus: 'no_agreement', notes: 'Accord de distribution à négocier.' },
  { id: 'see_tickets', displayName: 'See Tickets', markets: ['FR', 'US'], contractStatus: 'no_agreement', notes: 'Accord de distribution à négocier.' },
  { id: 'weezevent', displayName: 'Weezevent', markets: ['FR'], contractStatus: 'no_agreement', notes: 'Accord et accès API à obtenir.' },
];

/**
 * Connecteur « non implémenté » : aucune capacité, aucune méthode. Toute tentative d'utilisation
 * lève capability_not_supported via requireMethod(). Il ne simule JAMAIS une connexion.
 */
export function createUnimplementedConnector(partner: PlannedPartner): TicketingConnector {
  const capabilities: CapabilitySet = declareCapabilities([]);
  return Object.freeze({ id: partner.id, displayName: partner.displayName, mode: 'live' as const, capabilities });
}

export function connectorInfo(connector: TicketingConnector, implemented: boolean): ConnectorInfo {
  return {
    id: connector.id,
    displayName: connector.displayName,
    mode: connector.mode,
    capabilities: connector.capabilities,
    implemented,
  };
}

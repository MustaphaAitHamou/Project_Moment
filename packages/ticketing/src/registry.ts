import { AppError } from '@tamurt/core';
import type { TicketingConnector } from './connector';
import { connectorInfo, createUnimplementedConnector, PLANNED_PARTNERS } from './partners';
import type { ConnectorInfo } from './types';

export interface ConnectorRegistryOptions {
  demo: TicketingConnector;
  /** Connecteurs réels implémentés ET configurés (identifiants présents). */
  live?: TicketingConnector[];
  /** Liste blanche explicite (variable TICKETING_LIVE_PROVIDERS) : activation volontaire requise. */
  liveEnabledIds?: string[];
}

/**
 * Registre des connecteurs. Sépare strictement :
 *  - l'environnement « demo » : uniquement le fournisseur fictif ;
 *  - l'environnement « live » : uniquement un connecteur réel implémenté, configuré et activé.
 */
export class ConnectorRegistry {
  private readonly demo: TicketingConnector;
  private readonly live = new Map<string, TicketingConnector>();
  private readonly liveEnabled: Set<string>;

  constructor(options: ConnectorRegistryOptions) {
    if (options.demo.mode !== 'demo') {
      throw new Error('le connecteur de démonstration doit être en mode demo');
    }
    this.demo = options.demo;
    for (const connector of options.live ?? []) {
      if (connector.mode === 'demo') throw new Error(`${connector.id} : un connecteur réel ne peut pas être en mode demo`);
      this.live.set(connector.id, connector);
    }
    this.liveEnabled = new Set(options.liveEnabledIds ?? []);
  }

  get(providerId: string, environment: 'demo' | 'live'): TicketingConnector {
    if (environment === 'demo') {
      if (providerId !== this.demo.id) {
        throw new AppError('provider_not_configured', `fournisseur de démonstration inconnu : ${providerId}`);
      }
      return this.demo;
    }
    const connector = this.live.get(providerId);
    if (!connector) {
      throw new AppError('provider_not_configured', `aucun connecteur réel configuré pour ${providerId}`);
    }
    if (!this.liveEnabled.has(providerId)) {
      throw new AppError('live_mode_disabled', `${providerId} n'est pas activé en production`);
    }
    return connector;
  }

  /** Vue d'ensemble pour l'administration (démo, connecteurs réels, partenaires envisagés). */
  describe(): ConnectorInfo[] {
    const infos: ConnectorInfo[] = [connectorInfo(this.demo, true)];
    for (const connector of this.live.values()) infos.push(connectorInfo(connector, true));
    for (const partner of PLANNED_PARTNERS) {
      if (!this.live.has(partner.id)) infos.push(connectorInfo(createUnimplementedConnector(partner), false));
    }
    return infos;
  }
}

export function parseLiveProviderList(value: string | undefined | null): string[] {
  return (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

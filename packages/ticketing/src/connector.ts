import { AppError } from '@tamurt/core';
import type { CapabilitySet, TicketingCapability } from './capabilities';
import type {
  Availability,
  ConfirmRequest,
  ConnectorMode,
  Delivery,
  Hold,
  HoldRequest,
  ProviderEvent,
  ProviderOffer,
  ProviderOrder,
  TransferResult,
  WebhookEvent,
} from './types';

/**
 * Interface métier commune à tous les connecteurs de billetterie. Chaque méthode est optionnelle :
 * sa présence DOIT correspondre à une capacité déclarée (vérifié par assertConnectorConsistency).
 */
export interface TicketingConnector {
  readonly id: string;
  readonly displayName: string;
  readonly mode: ConnectorMode;
  readonly capabilities: CapabilitySet;

  listEvents?(params: { cursor?: string | null; limit?: number }): Promise<{ items: ProviderEvent[]; nextCursor: string | null }>;
  listOffers?(externalEventId: string): Promise<ProviderOffer[]>;
  getAvailability?(externalOfferId: string): Promise<Availability>;
  createHold?(request: HoldRequest): Promise<Hold>;
  releaseHold?(holdRef: string): Promise<Hold>;
  confirmOrder?(request: ConfirmRequest): Promise<ProviderOrder>;
  getOrder?(orderRef: string): Promise<ProviderOrder>;
  getDelivery?(orderRef: string): Promise<Delivery>;
  refundOrder?(orderRef: string): Promise<ProviderOrder>;
  transferTicket?(ticketRef: string, newHolderRef: string): Promise<TransferResult>;
  verifyOwnership?(ticketRef: string, holderRef: string): Promise<boolean>;
  verifyWebhook?(headers: Record<string, string | undefined>, rawBody: string): Promise<WebhookEvent>;
}

/** Correspondance méthode -> capacité requise. */
export const METHOD_CAPABILITY = {
  listEvents: 'catalog.events',
  listOffers: 'inventory.categories',
  getAvailability: 'inventory.availability',
  createHold: 'inventory.hold',
  releaseHold: 'inventory.hold',
  confirmOrder: 'order.confirm',
  getOrder: 'order.status',
  getDelivery: 'delivery.retrieve',
  refundOrder: 'refund',
  transferTicket: 'ticket.transfer',
  verifyOwnership: 'ticket.ownership_verification',
  verifyWebhook: 'webhooks',
} as const satisfies Record<string, TicketingCapability>;

export type ConnectorMethod = keyof typeof METHOD_CAPABILITY;

export function supports(connector: TicketingConnector, capability: TicketingCapability): boolean {
  return connector.capabilities[capability] === true;
}

/**
 * Renvoie la méthode liée si le connecteur déclare la capacité ET l'implémente ;
 * sinon lève capability_not_supported (jamais d'appel « à l'aveugle »).
 */
export function requireMethod<M extends ConnectorMethod>(
  connector: TicketingConnector,
  method: M,
): NonNullable<TicketingConnector[M]> {
  const capability = METHOD_CAPABILITY[method];
  const fn = connector[method];
  if (!supports(connector, capability) || typeof fn !== 'function') {
    throw new AppError('capability_not_supported', `${connector.id} ne déclare pas « ${capability} »`, {
      provider: connector.id,
      capability,
    });
  }
  return (fn as (...args: unknown[]) => unknown).bind(connector) as NonNullable<TicketingConnector[M]>;
}

/** Vérifie la cohérence capacités déclarées <-> méthodes implémentées. */
export function assertConnectorConsistency(connector: TicketingConnector): string[] {
  const problems: string[] = [];
  for (const [method, capability] of Object.entries(METHOD_CAPABILITY) as [ConnectorMethod, TicketingCapability][]) {
    const implemented = typeof connector[method] === 'function';
    if (connector.capabilities[capability] && !implemented) {
      problems.push(`capacité « ${capability} » déclarée mais ${method}() absente`);
    }
  }
  return problems;
}

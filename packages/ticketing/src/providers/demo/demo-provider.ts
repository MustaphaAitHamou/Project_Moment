import { AppError } from '@tamurt/core';
import { declareCapabilities } from '../../capabilities';
import type { TicketingConnector } from '../../connector';
import type {
  Availability,
  ConfirmRequest,
  Delivery,
  Hold,
  HoldRequest,
  ProviderEvent,
  ProviderOffer,
  ProviderOrder,
  TransferResult,
  WebhookEvent,
} from '../../types';
import type { DemoHoldRecord, DemoInventoryStore, DemoOrderRecord } from './store';
import { verifyDemoWebhookSignature } from './webhooks';

export const DEMO_PROVIDER_ID = 'demo';

export interface DemoTicketProviderOptions {
  /** Secret HMAC des webhooks de démonstration (variable DEMO_PROVIDER_WEBHOOK_SECRET). */
  webhookSecret?: string | null;
  /** Durée maximale d'un blocage de places, en secondes. */
  maxHoldSeconds?: number;
}

/**
 * Fournisseur de billetterie ENTIÈREMENT FICTIF. Il reproduit le comportement attendu d'un
 * partenaire (catalogue, stock, blocage temporaire, commande, livraison, remboursement,
 * transfert, webhooks signés) afin de démontrer le parcours complet sans aucun accord réel.
 * Les billets émis ne portent aucun code d'accès et sont présentés comme NON VALABLES.
 */
export class DemoTicketProvider implements TicketingConnector {
  readonly id = DEMO_PROVIDER_ID;
  readonly displayName = 'DemoTicketProvider (fictif)';
  readonly mode = 'demo' as const;
  readonly capabilities = declareCapabilities([
    'catalog.events',
    'catalog.pricing',
    'inventory.categories',
    'inventory.availability',
    'inventory.hold',
    'checkout.distributor_payment',
    'order.confirm',
    'order.status',
    'delivery.retrieve',
    'refund',
    'webhooks',
    'ticket.transfer',
    'ticket.ownership_verification',
  ]);

  private readonly maxHoldSeconds: number;

  constructor(
    private readonly store: DemoInventoryStore,
    private readonly options: DemoTicketProviderOptions = {},
  ) {
    this.maxHoldSeconds = options.maxHoldSeconds ?? 900;
  }

  async listEvents(params: { cursor?: string | null; limit?: number }): Promise<{ items: ProviderEvent[]; nextCursor: string | null }> {
    // Le catalogue fictif est piloté par Tamurt : chaque événement de démonstration est son propre « event_ref ».
    void params;
    return { items: [], nextCursor: null };
  }

  async listOffers(externalEventId: string): Promise<ProviderOffer[]> {
    const offers = await this.store.listOffers(externalEventId);
    return offers.map((o) => ({
      externalOfferId: o.offerRef,
      externalEventId: o.eventRef,
      name: o.label,
      currency: o.currency,
      faceValueMinor: o.faceValueMinor,
      bookingFeeMinor: o.bookingFeeMinor,
      capacity: o.capacity,
      available: o.available,
      maxPerOrder: o.maxPerOrder,
      transferable: o.transferable,
    }));
  }

  async getAvailability(externalOfferId: string): Promise<Availability> {
    const a = await this.store.availability(externalOfferId);
    return { externalOfferId: a.offer_ref, available: a.available, capacity: a.capacity, maxPerOrder: a.max_per_order };
  }

  async createHold(request: HoldRequest): Promise<Hold> {
    const ttl = Math.min(Math.max(Math.floor(request.ttlSeconds), 30), this.maxHoldSeconds);
    return toHold(await this.store.createHold(request.externalOfferId, request.quantity, ttl, request.clientKey));
  }

  async releaseHold(holdRef: string): Promise<Hold> {
    return toHold(await this.store.releaseHold(holdRef));
  }

  async confirmOrder(request: ConfirmRequest): Promise<ProviderOrder> {
    return toOrder(await this.store.confirmHold(request.holdRef, request.holderRef));
  }

  async getOrder(orderRef: string): Promise<ProviderOrder> {
    return toOrder(await this.store.getOrder(orderRef));
  }

  async getDelivery(orderRef: string): Promise<Delivery> {
    const order = await this.store.getOrder(orderRef);
    return {
      orderRef,
      mode: 'demo_specimen',
      // Aucun code-barres / QR code n'est fabriqué pour un billet fictif.
      tickets: order.tickets.map((t) => ({ ticketRef: t.ticket_ref, barcodeFormat: null, barcodeValue: null, offlineAllowed: false })),
      instructions: 'Billet de démonstration non valable — aucun accès à un événement.',
    };
  }

  async refundOrder(orderRef: string): Promise<ProviderOrder> {
    return toOrder(await this.store.refundOrder(orderRef));
  }

  async transferTicket(ticketRef: string, newHolderRef: string): Promise<TransferResult> {
    const result = await this.store.transferTicket(ticketRef, newHolderRef);
    return { previousTicketRef: result.previous_ticket_ref, ticketRef: result.ticket_ref, holderRef: result.holder_ref };
  }

  async verifyOwnership(ticketRef: string, holderRef: string): Promise<boolean> {
    return this.store.verifyOwnership(ticketRef, holderRef);
  }

  async verifyWebhook(headers: Record<string, string | undefined>, rawBody: string): Promise<WebhookEvent> {
    if (!this.options.webhookSecret) {
      throw new AppError('provider_not_configured', 'DEMO_PROVIDER_WEBHOOK_SECRET non défini');
    }
    await verifyDemoWebhookSignature(this.options.webhookSecret, headers['x-demo-signature'], rawBody);
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      throw new AppError('validation_failed', 'corps JSON invalide');
    }
    const event = parsed as Partial<WebhookEvent>;
    if (typeof event.id !== 'string' || typeof event.type !== 'string') {
      throw new AppError('validation_failed', 'événement incomplet');
    }
    return {
      id: event.id,
      type: event.type,
      occurredAt: typeof event.occurredAt === 'string' ? event.occurredAt : new Date().toISOString(),
      payload: (event.payload as Record<string, unknown>) ?? {},
    };
  }
}

function toHold(record: DemoHoldRecord): Hold {
  return {
    holdRef: record.hold_ref,
    externalOfferId: record.offer_ref,
    quantity: record.quantity,
    status: record.status,
    expiresAt: record.expires_at,
    orderRef: record.order_ref,
    replayed: record.replayed,
  };
}

function toOrder(record: DemoOrderRecord): ProviderOrder {
  return {
    orderRef: record.order_ref,
    holdRef: record.hold_ref,
    externalOfferId: record.offer_ref,
    quantity: record.quantity,
    amountMinor: Number(record.amount_minor),
    currency: record.currency,
    status: record.status,
    replayed: record.replayed,
    tickets: record.tickets.map((t) => ({ ticketRef: t.ticket_ref, status: t.status, holderRef: t.holder_ref })),
  };
}

import type { CapabilitySet } from './capabilities';

export type ConnectorMode = 'demo' | 'sandbox' | 'live';

export interface ProviderEvent {
  externalEventId: string;
  title: string;
  startsAt: string | null;
  venueName?: string | null;
  city?: string | null;
  countryCode?: string | null;
}

export interface ProviderOffer {
  externalOfferId: string;
  externalEventId: string;
  name: string;
  currency: string;
  faceValueMinor: number;
  bookingFeeMinor: number;
  capacity: number | null;
  available: number | null;
  maxPerOrder: number;
  transferable: boolean;
}

export interface Availability {
  externalOfferId: string;
  available: number;
  capacity: number | null;
  maxPerOrder: number;
}

export interface HoldRequest {
  externalOfferId: string;
  quantity: number;
  ttlSeconds: number;
  /** Clé idempotente : deux appels identiques renvoient le même blocage. */
  clientKey: string;
}

export type HoldStatus = 'held' | 'confirmed' | 'released' | 'expired';

export interface Hold {
  holdRef: string;
  externalOfferId: string;
  quantity: number;
  status: HoldStatus;
  expiresAt: string;
  orderRef: string | null;
  replayed: boolean;
}

export interface ConfirmRequest {
  holdRef: string;
  /** Référence opaque du titulaire (jamais de donnée personnelle brute). */
  holderRef: string;
}

export interface ProviderTicket {
  ticketRef: string;
  status: string;
  holderRef: string | null;
}

export interface ProviderOrder {
  orderRef: string;
  holdRef: string;
  externalOfferId: string;
  quantity: number;
  amountMinor: number;
  currency: string;
  status: 'confirmed' | 'refunded';
  tickets: ProviderTicket[];
  replayed: boolean;
}

export type DeliveryMode = 'demo_specimen' | 'provider_app' | 'provider_pdf' | 'wallet_pass';

export interface Delivery {
  orderRef: string;
  mode: DeliveryMode;
  tickets: {
    ticketRef: string;
    /** Toujours null pour un billet de démonstration : aucun code d'accès n'est fabriqué. */
    barcodeFormat: string | null;
    barcodeValue: string | null;
    offlineAllowed: boolean;
  }[];
  instructions: string | null;
}

export interface TransferResult {
  previousTicketRef: string;
  ticketRef: string;
  holderRef: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface ConnectorInfo {
  id: string;
  displayName: string;
  mode: ConnectorMode;
  capabilities: CapabilitySet;
  implemented: boolean;
}

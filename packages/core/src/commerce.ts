/**
 * Règles de vente (miroir de public.assert_offer_sellable) pour adapter l'interface avant appel serveur,
 * et helpers d'affichage des réservations temporaires.
 */

export type SellabilityReason =
  | 'ok'
  | 'event_not_on_sale'
  | 'event_not_ticketed'
  | 'offer_not_on_sale'
  | 'sales_not_started'
  | 'sales_ended';

export interface SellableOffer {
  status: string;
  sales_start_at: string | null;
  sales_end_at: string | null;
  min_per_order: number;
  max_per_order: number;
}

export interface SellableEvent {
  status: string;
  visibility: string;
  registration_mode: string;
  starts_at: string;
  deleted_at?: string | null;
}

export function offerSellability(offer: SellableOffer, event: SellableEvent, now: Date = new Date()): SellabilityReason {
  if (event.deleted_at || event.status !== 'published' || !['public', 'unlisted'].includes(event.visibility)) {
    return 'event_not_on_sale';
  }
  if (event.registration_mode !== 'tickets') return 'event_not_ticketed';
  if (offer.status !== 'on_sale') return 'offer_not_on_sale';
  if (offer.sales_start_at && new Date(offer.sales_start_at) > now) return 'sales_not_started';
  const salesEnd = offer.sales_end_at ? new Date(offer.sales_end_at) : new Date(event.starts_at);
  if (salesEnd <= now) return 'sales_ended';
  return 'ok';
}

export function quantityOptions(offer: SellableOffer, platformMax = 10): number[] {
  const max = Math.min(offer.max_per_order, platformMax);
  const options: number[] = [];
  for (let q = offer.min_per_order; q <= max; q += 1) options.push(q);
  return options;
}

export function secondsRemaining(expiresAt: string | Date, now: Date = new Date()): number {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));
}

export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/** Les commandes de démonstration sont reconnaissables à leur préfixe TD-. */
export function isDemoOrderNumber(orderNumber: string): boolean {
  return orderNumber.startsWith('TD-');
}

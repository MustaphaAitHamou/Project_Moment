import type {
  DemoAvailability,
  DemoHoldRecord,
  DemoInventory,
  DemoInventoryInput,
  DemoInventoryStore,
  DemoOrderRecord,
} from '@tamurt/ticketing';
import { unwrap } from './db';
import type { TamurtSupabaseClient } from './supabase';

/**
 * Store PostgreSQL du fournisseur fictif : chaque opération appelle une fonction SQL atomique
 * (verrous de ligne, décrément conditionnel) réservée au rôle service.
 */
export class PostgresDemoInventoryStore implements DemoInventoryStore {
  constructor(private readonly admin: TamurtSupabaseClient) {}

  async upsertInventory(input: DemoInventoryInput): Promise<DemoInventory> {
    const row = unwrap(
      await this.admin.rpc('demo_provider_upsert_inventory', {
        p_offer_ref: input.offerRef,
        p_event_ref: input.eventRef,
        p_label: input.label,
        p_currency: input.currency,
        p_face_value_minor: input.faceValueMinor,
        p_booking_fee_minor: input.bookingFeeMinor,
        p_capacity: input.capacity,
        p_max_per_order: input.maxPerOrder ?? 10,
        p_transferable: input.transferable ?? true,
      }),
    ) as Record<string, number | string | boolean>;
    return toInventory(row);
  }

  async listOffers(eventRef: string): Promise<DemoInventory[]> {
    const rows = unwrap(await this.admin.rpc('demo_provider_list_offers', { p_event_ref: eventRef })) as Record<string, number | string | boolean>[];
    return rows.map(toInventory);
  }

  async availability(offerRef: string): Promise<DemoAvailability> {
    return unwrap(await this.admin.rpc('demo_provider_availability', { p_offer_ref: offerRef })) as unknown as DemoAvailability;
  }

  async createHold(offerRef: string, quantity: number, ttlSeconds: number, clientKey: string | null): Promise<DemoHoldRecord> {
    return unwrap(
      await this.admin.rpc('demo_provider_create_hold', {
        p_offer_ref: offerRef,
        p_quantity: quantity,
        p_ttl_seconds: ttlSeconds,
        ...(clientKey ? { p_client_key: clientKey } : {}),
      }),
    ) as unknown as DemoHoldRecord;
  }

  async releaseHold(holdRef: string): Promise<DemoHoldRecord> {
    return unwrap(await this.admin.rpc('demo_provider_release_hold', { p_hold_ref: holdRef })) as unknown as DemoHoldRecord;
  }

  async confirmHold(holdRef: string, holderRef: string | null): Promise<DemoOrderRecord> {
    return unwrap(
      await this.admin.rpc('demo_provider_confirm_hold', { p_hold_ref: holdRef, ...(holderRef ? { p_holder_ref: holderRef } : {}) }),
    ) as unknown as DemoOrderRecord;
  }

  async getOrder(orderRef: string): Promise<DemoOrderRecord> {
    return unwrap(await this.admin.rpc('demo_provider_get_order', { p_order_ref: orderRef })) as unknown as DemoOrderRecord;
  }

  async refundOrder(orderRef: string): Promise<DemoOrderRecord> {
    return unwrap(await this.admin.rpc('demo_provider_refund_order', { p_order_ref: orderRef })) as unknown as DemoOrderRecord;
  }

  async transferTicket(ticketRef: string, newHolderRef: string) {
    return unwrap(
      await this.admin.rpc('demo_provider_transfer_ticket', { p_ticket_ref: ticketRef, p_new_holder_ref: newHolderRef }),
    ) as unknown as { previous_ticket_ref: string; ticket_ref: string; holder_ref: string };
  }

  async verifyOwnership(ticketRef: string, holderRef: string): Promise<boolean> {
    return Boolean(
      unwrap(await this.admin.rpc('demo_provider_verify_ownership', { p_ticket_ref: ticketRef, p_holder_ref: holderRef })),
    );
  }
}

function toInventory(row: Record<string, number | string | boolean>): DemoInventory {
  const capacity = Number(row.capacity);
  const sold = Number(row.sold ?? 0);
  const held = Number(row.held ?? 0);
  return {
    offerRef: String(row.offer_ref),
    eventRef: String(row.event_ref),
    label: String(row.label),
    currency: String(row.currency),
    faceValueMinor: Number(row.face_value_minor),
    bookingFeeMinor: Number(row.booking_fee_minor),
    capacity,
    maxPerOrder: Number(row.max_per_order),
    transferable: Boolean(row.transferable),
    sold,
    held,
    available: row.available !== undefined ? Number(row.available) : capacity - sold - held,
  };
}

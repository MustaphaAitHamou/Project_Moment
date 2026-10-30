import { AppError } from '@tamurt/core';

/**
 * Système d'information du fournisseur FICTIF. Deux implémentations respectent ce contrat :
 *  - MemoryDemoInventoryStore (tests unitaires, horloge contrôlable) ;
 *  - un store PostgreSQL (packages/server) appelant les fonctions atomiques demo_provider_*.
 * Une même suite de tests de contrat valide les deux.
 */

export interface DemoInventoryInput {
  offerRef: string;
  eventRef: string;
  label: string;
  currency: string;
  faceValueMinor: number;
  bookingFeeMinor: number;
  capacity: number;
  maxPerOrder?: number;
  transferable?: boolean;
}

export interface DemoInventory extends Required<DemoInventoryInput> {
  sold: number;
  held: number;
  available: number;
}

export interface DemoHoldRecord {
  hold_ref: string;
  offer_ref: string;
  quantity: number;
  status: 'held' | 'confirmed' | 'released' | 'expired';
  expires_at: string;
  order_ref: string | null;
  replayed: boolean;
}

export interface DemoOrderRecord {
  order_ref: string;
  hold_ref: string;
  offer_ref: string;
  quantity: number;
  amount_minor: number;
  currency: string;
  status: 'confirmed' | 'refunded';
  created_at: string;
  replayed: boolean;
  tickets: { ticket_ref: string; status: string; holder_ref: string | null }[];
}

export interface DemoAvailability {
  offer_ref: string;
  capacity: number;
  sold: number;
  held: number;
  available: number;
  max_per_order: number;
}

export interface DemoInventoryStore {
  upsertInventory(input: DemoInventoryInput): Promise<DemoInventory>;
  listOffers(eventRef: string): Promise<DemoInventory[]>;
  availability(offerRef: string): Promise<DemoAvailability>;
  createHold(offerRef: string, quantity: number, ttlSeconds: number, clientKey: string | null): Promise<DemoHoldRecord>;
  releaseHold(holdRef: string): Promise<DemoHoldRecord>;
  confirmHold(holdRef: string, holderRef: string | null): Promise<DemoOrderRecord>;
  getOrder(orderRef: string): Promise<DemoOrderRecord>;
  refundOrder(orderRef: string): Promise<DemoOrderRecord>;
  transferTicket(ticketRef: string, newHolderRef: string): Promise<{ previous_ticket_ref: string; ticket_ref: string; holder_ref: string }>;
  verifyOwnership(ticketRef: string, holderRef: string): Promise<boolean>;
}

interface MemoryHold {
  holdRef: string;
  offerRef: string;
  quantity: number;
  status: DemoHoldRecord['status'];
  expiresAt: Date;
  clientKey: string | null;
  orderRef: string | null;
}

interface MemoryTicket {
  ticketRef: string;
  orderRef: string | null;
  offerRef: string;
  holderRef: string | null;
  status: 'valid_demo' | 'void' | 'refunded';
  reissuedFrom: string | null;
}

interface MemoryOrder {
  orderRef: string;
  holdRef: string;
  offerRef: string;
  quantity: number;
  amountMinor: number;
  currency: string;
  status: 'confirmed' | 'refunded';
  createdAt: Date;
}

/**
 * Implémentation en mémoire, fidèle aux fonctions SQL. Chaque opération est synchrone entre
 * ses lectures et écritures (aucun await intermédiaire) : elle est donc atomique dans la boucle
 * d'événements JavaScript, comme le verrou de ligne en base.
 */
export class MemoryDemoInventoryStore implements DemoInventoryStore {
  private readonly inventory = new Map<string, DemoInventory>();
  private readonly holds = new Map<string, MemoryHold>();
  private readonly orders = new Map<string, MemoryOrder>();
  private readonly tickets = new Map<string, MemoryTicket>();
  private sequence = 0;

  constructor(private readonly now: () => Date = () => new Date()) {}

  private ref(prefix: string): string {
    this.sequence += 1;
    return `${prefix}-${this.sequence.toString(16).toUpperCase().padStart(16, '0')}`;
  }

  private getInventory(offerRef: string): DemoInventory {
    const inv = this.inventory.get(offerRef);
    if (!inv) throw new AppError('offer_not_found');
    return inv;
  }

  private releaseExpired(offerRef?: string): void {
    const now = this.now().getTime();
    for (const hold of this.holds.values()) {
      if (hold.status === 'held' && hold.expiresAt.getTime() <= now && (!offerRef || hold.offerRef === offerRef)) {
        hold.status = 'expired';
        const inv = this.getInventory(hold.offerRef);
        inv.held -= hold.quantity;
        inv.available = inv.capacity - inv.sold - inv.held;
      }
    }
  }

  private holdRecord(hold: MemoryHold, replayed: boolean): DemoHoldRecord {
    return {
      hold_ref: hold.holdRef,
      offer_ref: hold.offerRef,
      quantity: hold.quantity,
      status: hold.status,
      expires_at: hold.expiresAt.toISOString(),
      order_ref: hold.orderRef,
      replayed,
    };
  }

  private orderRecord(orderRef: string, replayed: boolean): DemoOrderRecord {
    const order = this.orders.get(orderRef);
    if (!order) throw new AppError('order_not_found');
    return {
      order_ref: order.orderRef,
      hold_ref: order.holdRef,
      offer_ref: order.offerRef,
      quantity: order.quantity,
      amount_minor: order.amountMinor,
      currency: order.currency,
      status: order.status,
      created_at: order.createdAt.toISOString(),
      replayed,
      tickets: [...this.tickets.values()]
        .filter((t) => t.orderRef === orderRef)
        .map((t) => ({ ticket_ref: t.ticketRef, status: t.status, holder_ref: t.holderRef })),
    };
  }

  async upsertInventory(input: DemoInventoryInput): Promise<DemoInventory> {
    const existing = this.inventory.get(input.offerRef);
    const sold = existing?.sold ?? 0;
    const held = existing?.held ?? 0;
    if (input.capacity < sold + held) throw new AppError('conflict', 'capacité inférieure aux ventes');
    const inv: DemoInventory = {
      offerRef: input.offerRef,
      eventRef: input.eventRef,
      label: input.label,
      currency: input.currency,
      faceValueMinor: input.faceValueMinor,
      bookingFeeMinor: input.bookingFeeMinor,
      capacity: input.capacity,
      maxPerOrder: input.maxPerOrder ?? 10,
      transferable: input.transferable ?? true,
      sold,
      held,
      available: input.capacity - sold - held,
    };
    this.inventory.set(input.offerRef, inv);
    return { ...inv };
  }

  async listOffers(eventRef: string): Promise<DemoInventory[]> {
    return [...this.inventory.values()].filter((i) => i.eventRef === eventRef).map((i) => ({ ...i }));
  }

  async availability(offerRef: string): Promise<DemoAvailability> {
    this.releaseExpired(offerRef);
    const inv = this.getInventory(offerRef);
    return {
      offer_ref: offerRef,
      capacity: inv.capacity,
      sold: inv.sold,
      held: inv.held,
      available: inv.capacity - inv.sold - inv.held,
      max_per_order: inv.maxPerOrder,
    };
  }

  async createHold(offerRef: string, quantity: number, ttlSeconds: number, clientKey: string | null): Promise<DemoHoldRecord> {
    if (!Number.isInteger(quantity) || quantity < 1) throw new AppError('invalid_quantity');
    if (!Number.isInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 3600) throw new AppError('invalid_expiry');
    if (clientKey) {
      const existing = [...this.holds.values()].find((h) => h.clientKey === clientKey);
      if (existing) return this.holdRecord(existing, true);
    }
    this.releaseExpired(offerRef);
    const inv = this.getInventory(offerRef);
    if (quantity > inv.maxPerOrder) throw new AppError('quantity_above_limit', undefined, { max_per_order: inv.maxPerOrder });
    if (inv.capacity - inv.sold - inv.held < quantity) throw new AppError('sold_out');
    inv.held += quantity;
    inv.available = inv.capacity - inv.sold - inv.held;
    const hold: MemoryHold = {
      holdRef: this.ref('DH'),
      offerRef,
      quantity,
      status: 'held',
      expiresAt: new Date(this.now().getTime() + ttlSeconds * 1000),
      clientKey,
      orderRef: null,
    };
    this.holds.set(hold.holdRef, hold);
    return this.holdRecord(hold, false);
  }

  async releaseHold(holdRef: string): Promise<DemoHoldRecord> {
    const hold = this.holds.get(holdRef);
    if (!hold) throw new AppError('hold_not_found');
    if (hold.status === 'confirmed') throw new AppError('hold_already_confirmed');
    if (hold.status === 'held') {
      hold.status = 'released';
      const inv = this.getInventory(hold.offerRef);
      inv.held -= hold.quantity;
      inv.available = inv.capacity - inv.sold - inv.held;
    }
    return this.holdRecord(hold, false);
  }

  async confirmHold(holdRef: string, holderRef: string | null): Promise<DemoOrderRecord> {
    const hold = this.holds.get(holdRef);
    if (!hold) throw new AppError('hold_not_found');
    if (hold.status === 'confirmed' && hold.orderRef) return this.orderRecord(hold.orderRef, true);
    if (hold.status !== 'held') throw new AppError('hold_not_active');
    if (hold.expiresAt.getTime() <= this.now().getTime()) throw new AppError('hold_expired');
    const inv = this.getInventory(hold.offerRef);
    inv.held -= hold.quantity;
    inv.sold += hold.quantity;
    inv.available = inv.capacity - inv.sold - inv.held;
    const order: MemoryOrder = {
      orderRef: this.ref('DO'),
      holdRef,
      offerRef: hold.offerRef,
      quantity: hold.quantity,
      amountMinor: hold.quantity * (inv.faceValueMinor + inv.bookingFeeMinor),
      currency: inv.currency,
      status: 'confirmed',
      createdAt: this.now(),
    };
    this.orders.set(order.orderRef, order);
    for (let i = 0; i < hold.quantity; i += 1) {
      const ticket: MemoryTicket = {
        ticketRef: this.ref('DT'),
        orderRef: order.orderRef,
        offerRef: hold.offerRef,
        holderRef,
        status: 'valid_demo',
        reissuedFrom: null,
      };
      this.tickets.set(ticket.ticketRef, ticket);
    }
    hold.status = 'confirmed';
    hold.orderRef = order.orderRef;
    return this.orderRecord(order.orderRef, false);
  }

  async getOrder(orderRef: string): Promise<DemoOrderRecord> {
    return this.orderRecord(orderRef, false);
  }

  async refundOrder(orderRef: string): Promise<DemoOrderRecord> {
    const order = this.orders.get(orderRef);
    if (!order) throw new AppError('order_not_found');
    if (order.status === 'refunded') return this.orderRecord(orderRef, true);
    let count = 0;
    for (const ticket of this.tickets.values()) {
      if (ticket.orderRef === orderRef && ticket.status === 'valid_demo') {
        ticket.status = 'refunded';
        count += 1;
      }
    }
    const inv = this.getInventory(order.offerRef);
    inv.sold = Math.max(inv.sold - count, 0);
    inv.available = inv.capacity - inv.sold - inv.held;
    order.status = 'refunded';
    return this.orderRecord(orderRef, false);
  }

  async transferTicket(ticketRef: string, newHolderRef: string) {
    const ticket = this.tickets.get(ticketRef);
    if (!ticket) throw new AppError('ticket_not_found');
    if (ticket.status !== 'valid_demo' || !this.getInventory(ticket.offerRef).transferable) {
      throw new AppError('ticket_not_transferable');
    }
    ticket.status = 'void';
    const next: MemoryTicket = {
      ticketRef: this.ref('DT'),
      orderRef: ticket.orderRef,
      offerRef: ticket.offerRef,
      holderRef: newHolderRef,
      status: 'valid_demo',
      reissuedFrom: ticketRef,
    };
    this.tickets.set(next.ticketRef, next);
    return { previous_ticket_ref: ticketRef, ticket_ref: next.ticketRef, holder_ref: newHolderRef };
  }

  async verifyOwnership(ticketRef: string, holderRef: string): Promise<boolean> {
    const ticket = this.tickets.get(ticketRef);
    return !!ticket && ticket.holderRef === holderRef && ticket.status === 'valid_demo';
  }
}

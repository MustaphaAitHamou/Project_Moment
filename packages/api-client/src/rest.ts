import { AppError, generateIdempotencyKey, isAppErrorCode, type PricingBreakdown } from '@tamurt/core';
import type {
  BetaFeedbackInput,
  BetaInvitationCreateInput,
  BetaWaitlistInput,
  CreateListingInput,
  CreateReservationInput,
  DemoPaymentInput,
  DisputeInput,
  EventFormInput,
  EventStatusAction,
  OrganizerInvitationInput,
  OrganizerProfileInput,
  PushTokenInput,
} from '@tamurt/validation';

/**
 * Client REST de l'API Tamurt (/api/v1). Utilisé par l'application mobile (jeton Bearer) et par
 * les composants client du web (cookies de session, même origine).
 */
export interface TamurtApiOptions {
  baseUrl: string;
  /** Jeton d'accès Supabase (mobile). Sur le web, laisser undefined : les cookies suffisent. */
  getAccessToken?: () => Promise<string | null> | string | null;
  fetchImpl?: typeof fetch;
  locale?: string;
}

export interface ReservationResponse {
  id: string;
  status: string;
  expiresAt: string;
  quantity: number;
  environment: 'demo' | 'live';
  offer: { id: string; name: string };
  event: { id: string; slug: string; title: string; startsAt: string; timezone: string };
  pricing: PricingBreakdown;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  environment: 'demo' | 'live';
  totalMinor: number;
  currency: string;
  expiresAt: string;
  ticketIds: string[];
}

export interface ListingResponse {
  id: string;
  status: string;
  askingPriceMinor: number;
  maxAllowedPriceMinor: number;
  buyerFeeMinor: number;
  sellerFeeMinor: number;
  currency: string;
  environment: 'demo' | 'live';
}

export interface ResaleTransactionResponse {
  id: string;
  status: string;
  totalMinor: number;
  currency: string;
  expiresAt: string;
  environment: 'demo' | 'live';
  newTicketId: string | null;
}

export class ApiError extends AppError {}

export function createTamurtApi(options: TamurtApiOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request<T>(method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
    const token = options.getAccessToken ? await options.getAccessToken() : null;
    const response = await fetchImpl(`${options.baseUrl.replace(/\/$/, '')}/api/v1${path}`, {
      method,
      headers: {
        accept: 'application/json',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(options.locale ? { 'accept-language': options.locale } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      credentials: 'include',
    });
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as unknown) : null;
    if (!response.ok) {
      const error = (payload as { error?: { code?: string; message?: string; details?: Record<string, unknown> } } | null)?.error;
      const code = error?.code && isAppErrorCode(error.code) ? error.code : 'internal_error';
      throw new ApiError(code, error?.message ?? code, error?.details);
    }
    return payload as T;
  }

  const withKey = (key?: string) => ({ 'idempotency-key': key ?? generateIdempotencyKey() });

  return {
    checkout: {
      reserve: (input: CreateReservationInput, idempotencyKey?: string) =>
        request<ReservationResponse>('POST', '/checkout/reservations', input, withKey(idempotencyKey)),
      getReservation: (id: string) => request<ReservationResponse>('GET', `/checkout/reservations/${id}`),
      releaseReservation: (id: string) => request<{ ok: true }>('DELETE', `/checkout/reservations/${id}`),
      createOrder: (reservationId: string, idempotencyKey?: string) =>
        request<OrderResponse>('POST', '/checkout/orders', { reservationId }, withKey(idempotencyKey)),
      pay: (orderId: string, payment: DemoPaymentInput) => request<OrderResponse>('POST', `/checkout/orders/${orderId}/pay`, payment),
      refundDemo: (orderId: string) => request<OrderResponse>('POST', `/checkout/orders/${orderId}/refund`, {}),
    },
    resale: {
      quote: (ticketId: string, askingPriceMinor?: number) =>
        request<Record<string, unknown>>('GET', `/resale/quote?ticketId=${ticketId}${askingPriceMinor ? `&price=${askingPriceMinor}` : ''}`),
      createListing: (input: CreateListingInput) => request<ListingResponse>('POST', '/resale/listings', input),
      cancelListing: (listingId: string) => request<ListingResponse>('DELETE', `/resale/listings/${listingId}`),
      purchase: (listingId: string, idempotencyKey?: string) =>
        request<ResaleTransactionResponse>('POST', `/resale/listings/${listingId}/purchase`, {}, withKey(idempotencyKey)),
      pay: (transactionId: string, payment: DemoPaymentInput) =>
        request<ResaleTransactionResponse>('POST', `/resale/transactions/${transactionId}/pay`, payment),
      dispute: (input: DisputeInput) => request<{ id: string; status: string }>('POST', '/resale/disputes', input),
    },
    events: {
      create: (organizerId: string, form: EventFormInput, action: 'save_draft' | 'submit' | 'publish') =>
        request<{ id: string; slug: string; status: string }>('POST', '/events', { organizerId, form, action }),
      update: (eventId: string, form: EventFormInput) => request<{ id: string; slug: string; status: string }>('PATCH', `/events/${eventId}`, { form }),
      changeStatus: (eventId: string, action: EventStatusAction) => request<{ id: string; status: string }>('POST', `/events/${eventId}/status`, action),
      track: (eventId: string, kind: 'view' | 'share' | 'calendar_add') => request<{ ok: true }>('POST', `/events/${eventId}/track`, { kind }),
    },
    organizers: {
      create: (input: OrganizerProfileInput) => request<{ id: string; slug: string }>('POST', '/organizers', input),
      invite: (organizerId: string, input: OrganizerInvitationInput) => request<{ id: string }>('POST', `/organizers/${organizerId}/invitations`, input),
    },
    beta: {
      info: () =>
        request<{ mode: 'open' | 'closed'; seatsTotal: number; seatsUsed: number; testflightUrl: string | null; playTestingUrl: string | null }>('GET', '/beta/info'),
      join: (input: BetaWaitlistInput) => request<{ emailSent: boolean; emailConfigured: boolean }>('POST', '/beta/waitlist', input),
      verify: (token: string) => request<{ verified: boolean }>('POST', '/beta/verify', { token }),
      redeem: (code: string) => request<{ status: string }>('POST', '/beta/redeem', { code }),
      feedback: (input: BetaFeedbackInput) => request<{ id: string }>('POST', '/beta/feedback', input),
      createInvitation: (input: BetaInvitationCreateInput) =>
        request<{ id: string; code: string; email: string | null; expiresAt: string; emailSent: boolean }>('POST', '/beta/invitations', input),
      revokeInvitation: (id: string) => request<{ ok: true }>('DELETE', `/beta/invitations/${id}`),
    },
    account: {
      delete: (password: string) => request<{ ok: true }>('DELETE', '/account', { password, confirm: true }),
    },
    pushTokens: {
      register: (input: PushTokenInput) => request<{ ok: true }>('POST', '/push-tokens', input),
    },
    geocode: (q: string, country: string) =>
      request<{ results: { label: string; lat: number; lng: number; postalCode: string | null; city: string | null }[] }>(
        'GET',
        `/geocode?q=${encodeURIComponent(q)}&country=${country}`,
      ),
  };
}

export type TamurtApi = ReturnType<typeof createTamurtApi>;

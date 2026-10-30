/**
 * Codes d'erreur métier partagés par la base (messages des exceptions PL/pgSQL),
 * le serveur (réponses API) et les clients (traductions `errors.<code>`).
 */
export const ERROR_STATUS = {
  // Authentification / autorisation
  unauthenticated: 401,
  forbidden: 403,
  account_suspended: 403,
  beta_access_required: 403,
  email_not_verified: 403,
  forbidden_column_change: 403,
  // Validation
  validation_failed: 422,
  invalid_quantity: 422,
  invalid_expiry: 422,
  invalid_range: 422,
  invalid_timezone: 422,
  invalid_status_transition: 409,
  quantity_above_limit: 422,
  // Ressources
  not_found: 404,
  event_not_found: 404,
  offer_not_found: 404,
  reservation_not_found: 404,
  order_not_found: 404,
  listing_not_found: 404,
  ticket_not_found: 404,
  transaction_not_found: 404,
  hold_not_found: 404,
  invitation_not_found: 404,
  registration_not_found: 404,
  // Conflits / idempotence / débit
  conflict: 409,
  idempotency_key_reused: 422,
  idempotency_key_missing: 400,
  request_in_progress: 409,
  rate_limited: 429,
  // Billetterie
  sold_out: 409,
  hold_expired: 410,
  hold_not_active: 409,
  hold_already_confirmed: 409,
  duplicate_hold: 409,
  reservation_expired: 410,
  reservation_not_active: 409,
  reservation_already_paid: 409,
  order_expired: 410,
  order_not_payable: 409,
  order_not_paid: 409,
  order_already_final: 409,
  payment_declined: 402,
  payment_failed: 502,
  amount_mismatch: 409,
  pricing_mismatch: 409,
  ticket_count_mismatch: 500,
  event_not_on_sale: 409,
  event_not_ticketed: 409,
  sales_not_started: 409,
  sales_ended: 409,
  offer_not_on_sale: 409,
  event_ended: 409,
  event_started: 409,
  event_full: 409,
  registration_not_available: 409,
  too_many_active_reservations: 429,
  promo_code_invalid: 422,
  promo_code_not_allowed: 422,
  live_mode_disabled: 403,
  demo_mode_disabled: 403,
  demo_requires_demo_payment: 403,
  capability_not_supported: 501,
  provider_not_configured: 503,
  provider_error: 502,
  // Revente
  resale_not_allowed: 403,
  resale_live_disabled: 403,
  resale_demo_disabled: 403,
  resale_window_closed: 409,
  resale_price_above_cap: 422,
  resale_price_below_minimum: 422,
  ticket_already_listed: 409,
  ticket_not_resellable: 409,
  ticket_not_transferable: 409,
  too_many_active_listings: 429,
  too_many_listings_for_event: 429,
  cannot_buy_own_listing: 409,
  listing_not_available: 409,
  listing_reserved: 409,
  transaction_not_payable: 409,
  transaction_not_transferable: 409,
  transaction_expired: 410,
  dispute_not_allowed: 409,
  dispute_already_open: 409,
  cannot_report_self: 409,
  // Bêta
  invalid_code: 404,
  invitation_revoked: 410,
  invitation_already_used: 409,
  invitation_expired: 410,
  invitation_email_mismatch: 403,
  invitation_not_active: 410,
  beta_full: 409,
  // Organisateurs
  last_owner_cannot_be_removed: 409,
  only_owner_can_manage_owners: 403,
  account_has_owned_organizers: 409,
  // Géocodage / divers
  geocoding_unavailable: 503,
  internal_error: 500,
} as const;

export type AppErrorCode = keyof typeof ERROR_STATUS;

export function isAppErrorCode(value: unknown): value is AppErrorCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ERROR_STATUS, value);
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: AppErrorCode, message?: string, details?: Record<string, unknown>) {
    super(message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = details;
  }

  toJSON(): { code: AppErrorCode; message: string; details?: Record<string, unknown> } {
    return this.details
      ? { code: this.code, message: this.message, details: this.details }
      : { code: this.code, message: this.message };
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convertit une erreur quelconque (PostgREST, réseau, AppError) en AppError.
 * Les fonctions SQL lèvent des exceptions dont le message est un code machine.
 */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error && typeof error === 'object') {
    const candidate = error as { message?: unknown; code?: unknown; details?: unknown };
    const message = typeof candidate.message === 'string' ? candidate.message.trim() : '';
    if (isAppErrorCode(message)) {
      let details: Record<string, unknown> | undefined;
      if (typeof candidate.details === 'string' && candidate.details.startsWith('{')) {
        try {
          details = JSON.parse(candidate.details) as Record<string, unknown>;
        } catch {
          details = undefined;
        }
      }
      return new AppError(message, message, details);
    }
    if (candidate.code === '42501') {
      return new AppError('forbidden', message || 'forbidden');
    }
    if (candidate.code === '23505') {
      return new AppError('conflict', message || 'conflict');
    }
    if (candidate.code === 'PGRST116') {
      return new AppError('not_found', message || 'not_found');
    }
  }
  return new AppError('internal_error', error instanceof Error ? error.message : 'internal_error');
}

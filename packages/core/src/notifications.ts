/** Types de notifications (texte rendu côté client dans la langue de l'utilisateur via i18n). */
export const NOTIFICATION_TYPES = [
  'event_cancelled',
  'event_rescheduled',
  'event_reminder',
  'city_new_event',
  'event_announcement',
  'order_confirmed',
  'ticket_available',
  'organizer_event_approved',
  'organizer_event_rejected',
  'organizer_new_registration',
  'organizer_invitation',
  'resale_listing_sold',
  'resale_purchase_completed',
  'resale_dispute_update',
  'beta_invitation',
  'beta_access_granted',
  'account_suspended',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === 'string' && (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

/** Notifications transactionnelles (envoyées même sans consentement marketing). */
export const ESSENTIAL_NOTIFICATION_TYPES: readonly NotificationType[] = [
  'order_confirmed',
  'ticket_available',
  'event_cancelled',
  'event_rescheduled',
  'account_suspended',
  'beta_access_granted',
  'resale_listing_sold',
  'resale_purchase_completed',
  'resale_dispute_update',
];

export const REMINDER_LEAD_HOURS = [1, 3, 24, 48, 168] as const;
export type ReminderLeadHours = (typeof REMINDER_LEAD_HOURS)[number];

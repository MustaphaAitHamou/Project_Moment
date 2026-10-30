/**
 * Cycle de vie d'un événement. Miroir de public.events_guard() (la base reste l'arbitre final).
 *
 *  draft ──► pending_review ──► published ──► cancelled
 *    │            │   ▲            │
 *    │            ▼   │            └──► archived (automatique après la fin)
 *    └──────────► rejected ─────────┘ (retour en brouillon / nouvelle soumission)
 *
 * Un organisateur VÉRIFIÉ disposant de la permission publish_events publie directement ;
 * sinon une demande de publication passe en modération (pending_review).
 */

export const EVENT_STATUSES = ['draft', 'pending_review', 'published', 'rejected', 'cancelled', 'archived'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export type EventActor = 'member' | 'staff' | 'system';

export interface TransitionContext {
  actor: EventActor;
  organizerVerified: boolean;
  canPublish: boolean;
}

export interface TransitionResult {
  allowed: boolean;
  /** Statut effectivement appliqué (ex. publication convertie en demande de modération). */
  effectiveStatus: EventStatus;
}

const MEMBER_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  draft: ['pending_review', 'published', 'cancelled'],
  pending_review: ['draft', 'published'],
  rejected: ['draft', 'pending_review', 'published'],
  published: ['cancelled'],
  cancelled: [],
  archived: [],
};

export function transitionEventStatus(from: EventStatus, to: EventStatus, ctx: TransitionContext): TransitionResult {
  if (from === to) return { allowed: true, effectiveStatus: to };
  if (ctx.actor === 'staff' || ctx.actor === 'system') {
    const allowed = !(from === 'archived' && to === 'published');
    return { allowed, effectiveStatus: to };
  }
  if (!MEMBER_TRANSITIONS[from].includes(to)) {
    return { allowed: false, effectiveStatus: from };
  }
  if (to === 'published' && !(ctx.organizerVerified && ctx.canPublish)) {
    return { allowed: true, effectiveStatus: 'pending_review' };
  }
  return { allowed: true, effectiveStatus: to };
}

export type EventTimeState = 'upcoming' | 'ongoing' | 'past';

const DEFAULT_EVENT_DURATION_MS = 3 * 60 * 60 * 1000;

export function eventTimeState(startsAt: string, endsAt: string | null | undefined, now: Date = new Date()): EventTimeState {
  const start = new Date(startsAt).getTime();
  const end = endsAt ? new Date(endsAt).getTime() : start + DEFAULT_EVENT_DURATION_MS;
  if (now.getTime() < start) return 'upcoming';
  if (now.getTime() <= end) return 'ongoing';
  return 'past';
}

export function isEditableStatus(status: EventStatus): boolean {
  return status === 'draft' || status === 'pending_review' || status === 'rejected' || status === 'published';
}

export function isPubliclyVisibleStatus(status: EventStatus): boolean {
  return status === 'published' || status === 'cancelled' || status === 'archived';
}

import type { Tone } from '@/components/ui/badge';

export function orderTone(status: string): Tone {
  if (status === 'fulfilled' || status === 'paid') return 'success';
  if (status === 'pending_payment') return 'warning';
  if (status === 'payment_failed') return 'danger';
  return 'neutral';
}

export function eventStatusTone(status: string): Tone {
  if (status === 'published') return 'success';
  if (status === 'pending_review') return 'warning';
  if (status === 'rejected' || status === 'cancelled') return 'danger';
  if (status === 'draft') return 'info';
  return 'neutral';
}

export function resaleTone(status: string): Tone {
  if (status === 'active' || status === 'completed' || status === 'sold') return 'success';
  if (status === 'reserved' || status === 'payment_pending' || status === 'transfer_pending' || status === 'initiated' || status === 'paid') return 'warning';
  if (status === 'disputed' || status === 'failed' || status === 'removed') return 'danger';
  return 'neutral';
}

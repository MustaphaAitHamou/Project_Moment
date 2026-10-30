'use server';
import { AppError, toAppError } from '@tamurt/core';
import { reportListingSchema } from '@tamurt/validation';
import { getSupabase, getViewer } from '../session';
import { runAction } from './result';

export async function reportListingAction(input: { listingId: string; reason: string; details?: string }) {
  return runAction(async () => {
    const viewer = await getViewer();
    if (!viewer) throw new AppError('unauthenticated');
    const parsed = reportListingSchema.safeParse(input);
    if (!parsed.success) throw new AppError('validation_failed');
    const { error } = await (await getSupabase()).rpc('report_resale_listing', {
      p_listing_id: parsed.data.listingId,
      p_reason: parsed.data.reason,
      p_details: parsed.data.details ?? '',
    });
    if (error) throw toAppError(error);
    return null;
  });
}

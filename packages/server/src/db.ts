import { AppError, toAppError } from '@tamurt/core';

interface PostgrestLikeError {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

/** Déballe un résultat supabase-js : renvoie les données ou lève une AppError typée. */
export function unwrap<T>(
  result: { data: T; error: PostgrestLikeError | null },
  notFound: Parameters<typeof notFoundError>[0] = 'not_found',
): NonNullable<T> {
  if (result.error) throw toAppError(result.error);
  if (result.data === null || result.data === undefined) throw notFoundError(notFound);
  return result.data as NonNullable<T>;
}

/** Comme unwrap mais autorise une absence de résultat. */
export function unwrapMaybe<T>(result: { data: T; error: PostgrestLikeError | null }): NonNullable<T> | null {
  if (result.error) throw toAppError(result.error);
  return (result.data ?? null) as NonNullable<T> | null;
}

function notFoundError(code: 'not_found' | 'event_not_found' | 'offer_not_found' | 'order_not_found' | 'reservation_not_found' | 'listing_not_found' | 'ticket_not_found' | 'transaction_not_found') {
  return new AppError(code);
}

/** Une fonction SQL renvoyant un type composite sans ligne produit un objet aux champs nuls. */
export function compositeOrNull<T extends { id?: unknown }>(value: T | null | undefined): T | null {
  if (!value || value.id === null || value.id === undefined) return null;
  return value;
}

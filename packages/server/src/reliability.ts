import { AppError, toAppError } from '@tamurt/core';
import type { ServerContext } from './context';
import { stableHash } from './crypto';

/**
 * Limitation de débit (fenêtre fixe, stockée en base : partagée entre toutes les instances).
 */
export async function enforceRateLimit(ctx: ServerContext, bucket: string, limit: number, windowSeconds: number): Promise<void> {
  const { data, error } = await ctx.admin.rpc('rate_limit_hit', {
    p_bucket: bucket.slice(0, 200),
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // En cas d'indisponibilité du limiteur, on journalise mais on ne bloque pas le service.
    ctx.logger.warn('rate_limit_unavailable', { bucket, error: error.message });
    return;
  }
  const result = data as { allowed: boolean; reset_at: string };
  if (!result.allowed) {
    throw new AppError('rate_limited', undefined, { reset_at: result.reset_at });
  }
}

export interface IdempotentResult<T> {
  status: number;
  body: T;
  replayed: boolean;
}

/**
 * Exécute une opération une seule fois par (utilisateur, portée, clé).
 *  - même clé + même corps : la réponse enregistrée est rejouée ;
 *  - même clé + corps différent : refus (idempotency_key_reused) ;
 *  - requête identique en cours : refus temporaire (request_in_progress).
 * Les échecs (exceptions) libèrent la clé pour permettre une nouvelle tentative.
 */
export async function withIdempotency<T>(
  ctx: ServerContext,
  params: { userId: string; scope: string; key: string; request: unknown },
  operation: () => Promise<{ status: number; body: T }>,
): Promise<IdempotentResult<T>> {
  const requestHash = stableHash(params.request);
  const begin = await ctx.admin.rpc('idempotency_begin', {
    p_user_id: params.userId,
    p_scope: params.scope,
    p_key: params.key,
    p_request_hash: requestHash,
  });
  if (begin.error) throw toAppError(begin.error);
  const state = begin.data as { state: 'started' | 'replay' | 'mismatch' | 'in_progress'; status?: number; body?: T };
  if (state.state === 'replay') {
    return { status: state.status ?? 200, body: state.body as T, replayed: true };
  }
  if (state.state === 'mismatch') throw new AppError('idempotency_key_reused');
  if (state.state === 'in_progress') throw new AppError('request_in_progress');

  try {
    const result = await operation();
    await ctx.admin.rpc('idempotency_complete', {
      p_user_id: params.userId,
      p_scope: params.scope,
      p_key: params.key,
      p_status: result.status,
      p_body: result.body as never,
    });
    return { ...result, replayed: false };
  } catch (error) {
    await ctx.admin.rpc('idempotency_abort', { p_user_id: params.userId, p_scope: params.scope, p_key: params.key });
    throw error;
  }
}

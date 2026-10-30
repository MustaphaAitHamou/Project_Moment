import { AppError, toAppError } from '@tamurt/core';
import { verifyDemoWebhookSignature } from '@tamurt/ticketing';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { apiRoute } from '@/lib/api';

const demoEventSchema = z.object({ id: z.string().min(1).max(200), type: z.string().min(1).max(100) }).loose();

/**
 * Réception des webhooks des fournisseurs de billetterie. Seul le fournisseur FICTIF « demo »
 * est implémenté : aucun webhook réel n'est accepté tant qu'un connecteur réel n'existe pas.
 * Signature HMAC vérifiée, horodatage limité (anti-rejeu) et enregistrement idempotent.
 */
export const POST = apiRoute<{ provider: string }>(async ({ ctx, params, request }) => {
  if (params.provider !== 'demo') throw new AppError('not_found');
  const secret = ctx.env.DEMO_PROVIDER_WEBHOOK_SECRET;
  if (!secret) throw new AppError('not_found');
  const rawBody = await request.text();
  if (rawBody.length > 256 * 1024) throw new AppError('validation_failed', 'payload_too_large');
  await verifyDemoWebhookSignature(secret, request.headers.get('x-demo-signature') ?? undefined, rawBody);
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new AppError('validation_failed', 'invalid_json');
  }
  const event = demoEventSchema.parse(payload);
  const { error } = await ctx.admin.from('webhook_events').insert({
    provider: 'demo',
    external_event_id: event.id,
    event_type: event.type,
    signature_valid: true,
    payload: event as never,
    status: 'received',
  });
  if (error && error.code !== '23505') throw toAppError(error);
  return NextResponse.json({ received: true, duplicate: error?.code === '23505' });
});

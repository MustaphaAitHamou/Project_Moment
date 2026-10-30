import { events, sha256Hex } from '@tamurt/server';
import { uuidSchema } from '@tamurt/validation';
import { z } from 'zod';
import { apiRoute, clientIp, optionalUser, parseWith, readJson } from '@/lib/api';

const bodySchema = z.object({ kind: z.enum(['view', 'share', 'calendar_add']) });

/** Statistiques agrégées (vues, partages, ajouts au calendrier) : aucune donnée personnelle stockée. */
export const POST = apiRoute<{ id: string }>(async (args) => {
  const { kind } = await readJson(args.request, bodySchema);
  const user = await optionalUser(args).catch(() => null);
  const visitorKey = sha256Hex(user?.id ?? `${clientIp(args.request)}|${args.request.headers.get('user-agent') ?? ''}`);
  await events.trackEventInteraction(args.ctx, parseWith(uuidSchema, args.params.id), kind, visitorKey);
  return { ok: true };
});

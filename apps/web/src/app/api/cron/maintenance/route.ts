import { AppError } from '@tamurt/core';
import { maintenance, safeEqual } from '@tamurt/server';
import { apiRoute } from '@/lib/api';

/**
 * Tâches planifiées (Vercel Cron) : envoi des notifications en file d'attente et, si pg_cron
 * n'est pas disponible (?db=1), tâches de base (expiration, archivage, rappels, nettoyage).
 * Protégée par CRON_SECRET (en-tête Authorization: Bearer).
 */
export const GET = apiRoute(async ({ ctx, request }) => {
  const secret = ctx.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (!secret || !safeEqual(header, `Bearer ${secret}`)) throw new AppError('unauthenticated');
  const includeDatabaseJobs = request.nextUrl.searchParams.get('db') === '1';
  return { ok: true, results: await maintenance.runMaintenance(ctx, { includeDatabaseJobs }) };
});

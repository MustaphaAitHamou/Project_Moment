import type { ServerContext } from '../context';
import { processOutbox } from './notifications';

/**
 * Tâches de maintenance appelables par la route /api/cron/maintenance (Vercel Cron) lorsque
 * pg_cron n'est pas disponible, et pour l'envoi effectif des notifications (outbox).
 */
export async function runMaintenance(ctx: ServerContext, options: { includeDatabaseJobs: boolean }) {
  const results: Record<string, unknown> = {};
  if (options.includeDatabaseJobs) {
    for (const job of ['maintenance_expire_commerce', 'maintenance_archive_events', 'maintenance_queue_reminders', 'maintenance_cleanup'] as const) {
      const { data, error } = await ctx.admin.rpc(job);
      results[job] = error ? { error: error.message } : data;
    }
  }
  results.outbox = await processOutbox(ctx);
  return results;
}

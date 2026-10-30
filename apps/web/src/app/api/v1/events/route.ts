import { events } from '@tamurt/server';
import { uuidSchema } from '@tamurt/validation';
import { z } from 'zod';
import { apiRoute, created, readJson, requireUser } from '@/lib/api';

const bodySchema = z.object({
  organizerId: uuidSchema,
  action: z.enum(['save_draft', 'submit', 'publish']),
  form: z.record(z.string(), z.unknown()),
});

/** Le formulaire est validé par le service (schéma partagé eventFormSchema). */
export const POST = apiRoute(async (args) => {
  const user = await requireUser(args);
  const body = await readJson(args.request, bodySchema);
  return created(await events.createEvent(args.ctx, user, body.organizerId, body.form as never, body.action));
});

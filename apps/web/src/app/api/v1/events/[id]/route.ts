import { events } from '@tamurt/server';
import { uuidSchema } from '@tamurt/validation';
import { z } from 'zod';
import { apiRoute, parseWith, readJson, requireUser } from '@/lib/api';

const bodySchema = z.object({ form: z.record(z.string(), z.unknown()) });

export const PATCH = apiRoute<{ id: string }>(async (args) => {
  const user = await requireUser(args);
  const body = await readJson(args.request, bodySchema);
  return events.updateEvent(args.ctx, user, parseWith(uuidSchema, args.params.id), body.form as never);
});

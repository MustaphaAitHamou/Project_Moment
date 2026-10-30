import { events } from '@tamurt/server';
import { eventStatusActionSchema, uuidSchema } from '@tamurt/validation';
import { apiRoute, parseWith, readJson, requireUser } from '@/lib/api';

export const POST = apiRoute<{ id: string }>(async (args) => {
  const user = await requireUser(args);
  const action = await readJson(args.request, eventStatusActionSchema);
  return events.changeEventStatus(args.ctx, user, parseWith(uuidSchema, args.params.id), action);
});

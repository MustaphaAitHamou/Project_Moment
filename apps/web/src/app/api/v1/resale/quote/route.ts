import { resale } from '@tamurt/server';
import { minorAmountSchema, uuidSchema } from '@tamurt/validation';
import { apiRoute, parseWith, requireUser } from '@/lib/api';

export const GET = apiRoute(async (args) => {
  const user = await requireUser(args);
  const ticketId = parseWith(uuidSchema, args.request.nextUrl.searchParams.get('ticketId'));
  const rawPrice = args.request.nextUrl.searchParams.get('price');
  const price = rawPrice ? parseWith(minorAmountSchema, Number(rawPrice)) : null;
  return resale.quoteResale(args.ctx, user, ticketId, price);
});

import { negotiateLocale } from '@tamurt/i18n';
import { events } from '@tamurt/server';
import { apiRoute } from '@/lib/api';

/** Export iCalendar (.ics) d'un événement public : compatible Apple Calendar, Outlook, Google. */
export const GET = apiRoute<{ slug: string }>(async ({ ctx, params, request }) => {
  const locale = negotiateLocale(request.nextUrl.searchParams.get('locale') ?? request.headers.get('accept-language'));
  const { filename, content } = await events.buildEventIcs(ctx, params.slug, locale);
  return new Response(content, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  });
});

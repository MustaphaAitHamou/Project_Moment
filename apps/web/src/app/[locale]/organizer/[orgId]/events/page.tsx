import { CalendarPlus } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { eventDateTime } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getMembership } from '@/lib/organizer';
import { getSupabase } from '@/lib/session';
import { eventStatusTone } from '@/lib/status';

export default async function OrganizationEvents({ params }: PageProps<'/[locale]/organizer/[orgId]/events'>) {
  const { locale, orgId } = (await params) as { locale: AppLocale; orgId: string };
  setRequestLocale(locale);
  await requireViewer(locale, `/organizer/${orgId}/events`);
  const membership = await getMembership(orgId);
  if (!membership) notFound();
  const t = await getTranslations();
  const { data: events } = await (await getSupabase())
    .from('events')
    .select('id, slug, title, status, starts_at, timezone, country_code, views_count, favorites_count, registrations_count, is_demo, moderation_note')
    .eq('organizer_id', orgId)
    .is('deleted_at', null)
    .order('starts_at', { ascending: false })
    .limit(200);
  return (
    <div className="space-y-4">
      {membership.can('manage_events') ? (
        <Link href={{ pathname: '/organizer/events/new', query: { org: orgId } }} className={buttonClasses()}>{t('organizer.newEvent')}</Link>
      ) : null}
      {!events?.length ? (
        <EmptyState icon={CalendarPlus} title={t('organizer.noUpcoming')} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[42rem] text-sm">
            <thead className="bg-sunken text-start text-xs uppercase tracking-wide text-subtle">
              <tr>
                <th className="px-4 py-3 text-start">{t('eventForm.title')}</th>
                <th className="px-4 py-3 text-start">{t('common.date')}</th>
                <th className="px-4 py-3 text-start">{t('common.status')}</th>
                <th className="px-4 py-3 text-end">{t('organizer.stats.views')}</th>
                <th className="px-4 py-3 text-end">{t('organizer.stats.favorites')}</th>
                <th className="px-4 py-3 text-end">{t('organizer.stats.registrations')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-sunken/60">
                  <td className="px-4 py-3">
                    <Link href={`/organizer/events/${event.id}`} className="font-semibold hover:underline">{event.title}</Link>
                    {event.is_demo ? <Badge tone="demo" className="ms-2">{t('app.demoBadge')}</Badge> : null}
                  </td>
                  <td className="px-4 py-3 text-muted">{eventDateTime(event.starts_at, event.timezone, locale, event.country_code)}</td>
                  <td className="px-4 py-3"><Badge tone={eventStatusTone(event.status)}>{t(`organizer.eventStatuses.${event.status}`)}</Badge></td>
                  <td className="px-4 py-3 text-end tabular-nums">{event.views_count}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{event.favorites_count}</td>
                  <td className="px-4 py-3 text-end tabular-nums">{event.registrations_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

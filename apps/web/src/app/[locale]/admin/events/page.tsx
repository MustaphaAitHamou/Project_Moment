import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminAction } from '@/components/admin/admin-action';
import { DataTable, Td } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { reviewEventAction, setSponsoredAction } from '@/lib/actions/admin';
import { eventDateTime } from '@/lib/format';
import { requireStaffViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';
import { eventStatusTone } from '@/lib/status';
import { firstParam } from '@/lib/utils';

export default async function AdminEventsPage({ params, searchParams }: PageProps<'/[locale]/admin/events'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireStaffViewer(locale, '/admin/events');
  const t = await getTranslations();
  const q = (firstParam((await searchParams).q) ?? '').trim().slice(0, 80);
  let query = (await getSupabase()).from('events').select('id, slug, title, status, starts_at, timezone, country_code, is_demo, is_sponsored, views_count, organizer:organizer_profiles!inner(name)').is('deleted_at', null).order('starts_at', { ascending: false }).limit(100);
  if (q) query = query.ilike('title', `%${q.replace(/[%_]/g, '')}%`);
  const { data: events } = await query;
  return (
    <>
      <PageHeader title={t('admin.events')} />
      <form method="get" className="flex gap-2"><input name="q" defaultValue={q} placeholder={t('common.search')} className="w-72 rounded-md border border-line-strong bg-surface px-3 py-2 text-sm" /><button className="rounded-full bg-primary px-4 text-sm font-semibold text-on-primary">{t('common.search')}</button></form>
      <DataTable head={[t('eventForm.title'), t('common.date'), t('common.status'), t('common.actions')]} empty={events?.length ? undefined : t('common.empty')}>
        {(events ?? []).map((event) => (
          <tr key={event.id}>
            <Td><Link href={`/events/${event.slug}`} className="font-semibold hover:underline">{event.title}</Link><br /><span className="text-xs text-subtle">{event.organizer.name} · {event.views_count} {t('organizer.stats.views').toLowerCase()}</span></Td>
            <Td className="text-muted">{eventDateTime(event.starts_at, event.timezone, locale, event.country_code)}</Td>
            <Td><div className="flex flex-wrap gap-1"><Badge tone={eventStatusTone(event.status)}>{t(`organizer.eventStatuses.${event.status}`)}</Badge>{event.is_demo ? <Badge tone="demo">{t('app.demoBadge')}</Badge> : null}{event.is_sponsored ? <Badge tone="accent">{t('app.sponsored')}</Badge> : null}</div></Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                {event.status === 'published' ? <AdminAction action={reviewEventAction.bind(null, event.id, 'unpublish')} label={t('admin.unpublish')} variant="danger" requireNote /> : null}
                {event.status === 'published' ? <AdminAction action={setSponsoredAction.bind(null, event.id, !event.is_sponsored)} label={event.is_sponsored ? t('admin.unsponsor') : t('admin.sponsor')} /> : null}
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}

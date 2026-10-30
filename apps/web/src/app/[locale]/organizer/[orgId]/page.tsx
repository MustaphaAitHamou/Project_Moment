import { ExternalLink, Plus } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { buttonClasses } from '@/components/ui/button';
import { Card, StatCard } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { money } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getMembership } from '@/lib/organizer';
import { getSupabase } from '@/lib/session';

interface Dashboard {
  events_by_status: Record<string, number>;
  upcoming_events: number;
  views_total: number;
  favorites_total: number;
  registrations_total: number;
  views_last_30d: { day: string; views: number; favorites: number; registrations: number }[];
  sales: Record<string, { orders: number; tickets: number; revenue_minor_by_currency: Record<string, number> }> | null;
}

export default async function OrganizationOverview({ params }: PageProps<'/[locale]/organizer/[orgId]'>) {
  const { locale, orgId } = (await params) as { locale: AppLocale; orgId: string };
  setRequestLocale(locale);
  await requireViewer(locale, `/organizer/${orgId}`);
  const membership = await getMembership(orgId);
  if (!membership) notFound();
  const t = await getTranslations();
  const canAnalytics = membership.can('view_analytics');
  const { data } = canAnalytics ? await (await getSupabase()).rpc('organizer_dashboard', { p_organizer_id: orgId }) : { data: null };
  const dashboard = data as Dashboard | null;
  const series = dashboard?.views_last_30d ?? [];
  const maxViews = Math.max(1, ...series.map((point) => point.views));
  const demoSales = dashboard?.sales?.demo;
  const liveSales = dashboard?.sales?.live;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {membership.can('manage_events') ? <Link href={{ pathname: '/organizer/events/new', query: { org: orgId } }} className={buttonClasses()}><Plus className="h-4 w-4" aria-hidden />{t('organizer.newEvent')}</Link> : null}
        <Link href={`/organizers/${membership.organizer.slug}`} className={buttonClasses({ variant: 'outline' })}>{t('organizer.publicPage')}<ExternalLink className="h-4 w-4" aria-hidden /></Link>
      </div>
      {dashboard ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t('organizer.stats.upcoming')} value={dashboard.upcoming_events} />
            <StatCard label={t('organizer.stats.views')} value={dashboard.views_total} />
            <StatCard label={t('organizer.stats.favorites')} value={dashboard.favorites_total} />
            <StatCard label={t('organizer.stats.registrations')} value={dashboard.registrations_total} />
          </div>
          <Card>
            <SectionHeader title={`${t('organizer.stats.views')} — ${t('organizer.stats.last30Days')}`} />
            {series.length ? (
              <div className="flex h-36 items-end gap-1" role="img" aria-label={`${t('organizer.stats.views')} : ${series.map((p) => `${p.day} ${p.views}`).join(', ')}`}>
                {series.map((point) => (
                  <div key={point.day} className="flex-1 rounded-t bg-primary/80" style={{ height: `${Math.max(4, (point.views / maxViews) * 100)}%` }} title={`${point.day} : ${point.views}`} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">{t('common.empty')}</p>
            )}
          </Card>
          {dashboard.sales ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Card>
                <p className="text-xs font-medium uppercase tracking-wide text-subtle">{t('organizer.stats.ticketsDemo')}</p>
                <p className="mt-1 font-display text-2xl font-bold">{demoSales?.tickets ?? 0}</p>
                <p className="text-sm text-muted">{t('organizer.stats.revenueDemo')} : {Object.entries(demoSales?.revenue_minor_by_currency ?? {}).map(([currency, amount]) => money(Number(amount), currency, locale)).join(' · ') || '—'}</p>
              </Card>
              <Card>
                <p className="text-xs font-medium uppercase tracking-wide text-subtle">{t('organizer.stats.ticketsLive')}</p>
                <p className="mt-1 font-display text-2xl font-bold">{liveSales?.tickets ?? 0}</p>
                <p className="text-sm text-muted">{t('organizer.stats.salesUnavailable')}</p>
              </Card>
            </div>
          ) : null}
          <Card>
            <SectionHeader title={t('organizer.events')} action={<Link href={`/organizer/${orgId}/events`} className="font-semibold text-primary hover:underline">{t('common.seeAll')}</Link>} />
            <ul className="flex flex-wrap gap-2 text-sm">
              {Object.entries(dashboard.events_by_status).map(([status, count]) => (
                <li key={status} className="rounded-full bg-sunken px-3 py-1">{t(`organizer.eventStatuses.${status as 'draft'}`)} : <strong>{count}</strong></li>
              ))}
            </ul>
          </Card>
        </>
      ) : (
        <Link href={`/organizer/${orgId}/events`} className={buttonClasses({ variant: 'outline' })}>{t('organizer.events')}</Link>
      )}
    </div>
  );
}

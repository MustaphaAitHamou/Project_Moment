import { getTranslations, setRequestLocale } from 'next-intl/server';
import { StatCard } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { money } from '@/lib/format';
import { requireStaffViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

const KEYS = ['users_total', 'users_last_7d', 'organizers_total', 'organizers_pending_verification', 'events_published', 'events_pending_review', 'events_demo', 'reports_open', 'media_pending', 'orders_demo', 'orders_demo_fulfilled', 'orders_live', 'resale_listings_active', 'resale_disputes_open', 'beta_waitlist', 'beta_testers', 'beta_feedback_new'] as const;

export default async function AdminDashboard({ params }: PageProps<'/[locale]/admin'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireStaffViewer(locale, '/admin');
  const t = await getTranslations('admin');
  const { data } = await (await getSupabase()).rpc('admin_platform_stats');
  const stats = (data ?? {}) as Record<string, number | Record<string, number>>;
  const revenue = (stats.revenue_demo_minor_by_currency ?? {}) as Record<string, number>;
  return (
    <>
      <PageHeader title={t('dashboard')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {KEYS.map((key) => (key in stats ? <StatCard key={key} label={t(`stats.${key}`)} value={Number(stats[key] ?? 0)} /> : null))}
        <StatCard label={t('demoOrders')} value={Object.entries(revenue).map(([currency, amount]) => money(Number(amount), currency, locale)).join(' · ') || '—'} />
      </div>
    </>
  );
}

import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminAction } from '@/components/admin/admin-action';
import { DataTable, Td } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { handleReportAction } from '@/lib/actions/admin';
import { dateTimeShort } from '@/lib/format';
import { requireStaffViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

export default async function ReportsPage({ params }: PageProps<'/[locale]/admin/reports'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireStaffViewer(locale, '/admin/reports');
  const t = await getTranslations();
  const supabase = await getSupabase();
  const [eventReports, userReports] = await Promise.all([
    supabase.from('event_reports').select('id, reason, details, status, created_at, event:events!inner(slug, title)').in('status', ['open', 'reviewing']).order('created_at').limit(100),
    supabase.from('user_reports').select('id, reason, details, status, context_type, created_at').in('status', ['open', 'reviewing']).order('created_at').limit(100),
  ]);
  const actions = (kind: 'event' | 'user', reportId: string) => (
    <div className="flex flex-wrap gap-2">
      <AdminAction action={handleReportAction.bind(null, kind, reportId, 'resolved')} label={t('admin.resolve')} variant="primary" requireNote />
      <AdminAction action={handleReportAction.bind(null, kind, reportId, 'dismissed')} label={t('admin.dismiss')} requireNote />
    </div>
  );
  return (
    <>
      <PageHeader title={t('admin.reports')} />
      <section>
        <SectionHeader title={`${t('admin.events')} (${eventReports.data?.length ?? 0})`} />
        <DataTable head={[t('eventForm.title'), t('common.details'), t('common.status'), t('common.actions')]} empty={eventReports.data?.length ? undefined : t('common.empty')}>
          {(eventReports.data ?? []).map((report) => (
            <tr key={report.id}>
              <Td><Link href={`/events/${report.event.slug}`} className="font-semibold hover:underline">{report.event.title}</Link><br /><span className="text-xs text-subtle">{dateTimeShort(report.created_at, locale)}</span></Td>
              <Td><Badge tone="warning">{t.has(`event.reportReasons.${report.reason}` as 'event.reportReasons.other') ? t(`event.reportReasons.${report.reason}` as 'event.reportReasons.other') : report.reason}</Badge><p className="mt-1 max-w-xs text-muted">{report.details}</p></Td>
              <Td><Badge>{report.status}</Badge></Td>
              <Td>{actions('event', report.id)}</Td>
            </tr>
          ))}
        </DataTable>
      </section>
      <section>
        <SectionHeader title={`${t('admin.users')} / ${t('admin.resale')} (${userReports.data?.length ?? 0})`} />
        <DataTable head={[t('common.details'), t('common.status'), t('common.actions')]} empty={userReports.data?.length ? undefined : t('common.empty')}>
          {(userReports.data ?? []).map((report) => (
            <tr key={report.id}>
              <Td><Badge tone="warning">{report.reason}</Badge> <span className="text-xs text-subtle">{report.context_type} · {dateTimeShort(report.created_at, locale)}</span><p className="mt-1 max-w-md text-muted">{report.details}</p></Td>
              <Td><Badge>{report.status}</Badge></Td>
              <Td>{actions('user', report.id)}</Td>
            </tr>
          ))}
        </DataTable>
      </section>
    </>
  );
}

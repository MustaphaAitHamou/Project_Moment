import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminAction } from '@/components/admin/admin-action';
import { DataTable, Td } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { reviewOrganizerAction } from '@/lib/actions/admin';
import { dateTimeShort } from '@/lib/format';
import { requireStaffViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

export default async function AdminOrganizersPage({ params }: PageProps<'/[locale]/admin/organizers'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireStaffViewer(locale, '/admin/organizers');
  const t = await getTranslations();
  const { data: organizers } = await (await getSupabase()).from('organizer_profiles').select('id, slug, name, kind, country_code, verification_status, is_demo, created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(200);
  return (
    <>
      <PageHeader title={t('admin.organizers')} />
      <DataTable head={[t('organizer.name'), t('organizer.kind'), t('common.status'), t('common.actions')]}>
        {(organizers ?? []).map((organizer) => (
          <tr key={organizer.id}>
            <Td><Link href={`/organizers/${organizer.slug}`} className="font-semibold hover:underline">{organizer.name}</Link><br /><span className="text-xs text-subtle">{organizer.country_code} · {dateTimeShort(organizer.created_at, locale)}</span></Td>
            <Td>{t(`organizer.kinds.${organizer.kind}`)}{organizer.is_demo ? <Badge tone="demo" className="ms-2">{t('app.demoBadge')}</Badge> : null}</Td>
            <Td><Badge tone={organizer.verification_status === 'verified' ? 'info' : 'neutral'}>{t(`organizer.verification.${organizer.verification_status}`)}</Badge></Td>
            <Td>
              {organizer.verification_status === 'verified' ? (
                <AdminAction action={reviewOrganizerAction.bind(null, organizer.id, 'unverify')} label={t('admin.unverify')} variant="danger" requireNote />
              ) : (
                <AdminAction action={reviewOrganizerAction.bind(null, organizer.id, 'verify')} label={t('admin.verify')} variant="primary" />
              )}
            </Td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}

import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminAction } from '@/components/admin/admin-action';
import { DataTable, Td } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { removeListingAction } from '@/lib/actions/admin';
import { dateTimeShort, money } from '@/lib/format';
import { requireStaffViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';
import { resaleTone } from '@/lib/status';

export default async function AdminResalePage({ params }: PageProps<'/[locale]/admin/resale'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireStaffViewer(locale, '/admin/resale');
  const t = await getTranslations();
  const supabase = await getSupabase();
  const [listings, disputes] = await Promise.all([
    supabase.from('resale_listings').select('id, status, environment, asking_price_minor, original_price_minor, max_allowed_price_minor, currency, created_at, event:events!inner(title)').in('status', ['active', 'reserved']).order('created_at', { ascending: false }).limit(100),
    supabase.from('resale_disputes').select('id, reason, details, status, created_at').order('created_at', { ascending: false }).limit(100),
  ]);
  return (
    <>
      <PageHeader title={t('admin.resale')} />
      <section>
        <SectionHeader title={t('resale.listings')} />
        <DataTable head={[t('eventForm.title'), t('resale.askingPrice'), t('common.status'), t('common.actions')]} empty={listings.data?.length ? undefined : t('common.empty')}>
          {(listings.data ?? []).map((listing) => (
            <tr key={listing.id}>
              <Td><span className="font-semibold">{listing.event.title}</span><br /><span className="text-xs text-subtle">{dateTimeShort(listing.created_at, locale)}</span></Td>
              <Td className="tabular-nums">{money(Number(listing.asking_price_minor), listing.currency, locale)} <span className="text-xs text-subtle">/ {money(Number(listing.max_allowed_price_minor), listing.currency, locale)}</span></Td>
              <Td><div className="flex gap-1"><Badge tone={resaleTone(listing.status)}>{t(`resale.listingStatus.${listing.status}` as 'resale.listingStatus.active')}</Badge>{listing.environment === 'demo' ? <Badge tone="demo">{t('app.demoBadge')}</Badge> : null}</div></Td>
              <Td><AdminAction action={removeListingAction.bind(null, listing.id)} label={t('admin.remove')} variant="danger" requireNote /></Td>
            </tr>
          ))}
        </DataTable>
      </section>
      <section>
        <SectionHeader title={t('resale.openDispute')} />
        <DataTable head={[t('common.details'), t('common.status'), t('common.date')]} empty={disputes.data?.length ? undefined : t('common.empty')}>
          {(disputes.data ?? []).map((dispute) => (
            <tr key={dispute.id}>
              <Td><Badge tone="warning">{t.has(`resale.disputeReasons.${dispute.reason}` as 'resale.disputeReasons.other') ? t(`resale.disputeReasons.${dispute.reason}` as 'resale.disputeReasons.other') : dispute.reason}</Badge><p className="mt-1 max-w-md text-muted">{dispute.details}</p></Td>
              <Td><Badge>{dispute.status}</Badge></Td>
              <Td className="text-muted">{dateTimeShort(dispute.created_at, locale)}</Td>
            </tr>
          ))}
        </DataTable>
      </section>
    </>
  );
}

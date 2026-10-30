import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminAction } from '@/components/admin/admin-action';
import { DataTable, Td } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { reviewEventAction, reviewMediaAction, reviewOrganizerAction } from '@/lib/actions/admin';
import { dateTimeShort, eventDateTime } from '@/lib/format';
import { requireStaffViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

export default async function ModerationPage({ params }: PageProps<'/[locale]/admin/moderation'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireStaffViewer(locale, '/admin/moderation');
  const t = await getTranslations();
  const supabase = await getSupabase();
  const [events, requests, media] = await Promise.all([
    supabase.from('events').select('id, slug, title, starts_at, timezone, country_code, submitted_at, is_demo, organizer:organizer_profiles!inner(name, verification_status)').eq('status', 'pending_review').is('deleted_at', null).order('submitted_at', { ascending: true }).limit(100),
    supabase.from('organizer_verification_requests').select('id, legal_name, registration_number, message, created_at, organizer:organizer_profiles!inner(id, name, kind, country_code)').eq('status', 'pending').order('created_at').limit(100),
    supabase.from('event_media').select('id, storage_path, alt_text, created_at, event:events!inner(slug, title)').eq('status', 'pending').limit(100),
  ]);
  return (
    <>
      <PageHeader title={t('admin.moderationQueue')} />
      <section>
        <SectionHeader title={`${t('admin.events')} (${events.data?.length ?? 0})`} />
        <DataTable head={[t('eventForm.title'), t('event.organizer'), t('common.date'), t('common.actions')]} empty={events.data?.length ? undefined : t('common.empty')}>
          {(events.data ?? []).map((event) => (
            <tr key={event.id}>
              <Td><Link href={`/events/${event.slug}`} className="font-semibold hover:underline">{event.title}</Link>{event.is_demo ? <Badge tone="demo" className="ms-2">{t('app.demoBadge')}</Badge> : null}</Td>
              <Td>{event.organizer.name} <Badge>{t(`organizer.verification.${event.organizer.verification_status}`)}</Badge></Td>
              <Td className="text-muted">{eventDateTime(event.starts_at, event.timezone, locale, event.country_code)}</Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <AdminAction action={reviewEventAction.bind(null, event.id, 'approve')} label={t('admin.approve')} variant="primary" />
                  <AdminAction action={reviewEventAction.bind(null, event.id, 'reject')} label={t('admin.reject')} variant="danger" requireNote />
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      </section>
      <section>
        <SectionHeader title={`${t('admin.organizers')} — ${t('organizer.verificationTitle')} (${requests.data?.length ?? 0})`} />
        <DataTable head={[t('organizer.name'), t('organizer.legalName'), t('organizer.verificationMessage'), t('common.actions')]} empty={requests.data?.length ? undefined : t('common.empty')}>
          {(requests.data ?? []).map((request) => (
            <tr key={request.id}>
              <Td><span className="font-semibold">{request.organizer.name}</span><br /><span className="text-xs text-subtle">{t(`organizer.kinds.${request.organizer.kind}`)} · {request.organizer.country_code} · {dateTimeShort(request.created_at, locale)}</span></Td>
              <Td>{request.legal_name}<br /><span className="text-xs text-subtle">{request.registration_number ?? '—'}</span></Td>
              <Td className="max-w-xs text-muted">{request.message ?? '—'}</Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <AdminAction action={reviewOrganizerAction.bind(null, request.organizer.id, 'verify')} label={t('admin.verify')} variant="primary" />
                  <AdminAction action={reviewOrganizerAction.bind(null, request.organizer.id, 'reject')} label={t('admin.reject')} variant="danger" requireNote />
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      </section>
      <section>
        <SectionHeader title={`${t('admin.media')} (${media.data?.length ?? 0})`} />
        <DataTable head={[t('admin.media'), t('eventForm.title'), t('common.actions')]} empty={media.data?.length ? undefined : t('common.empty')}>
          {(media.data ?? []).map((item) => (
            <tr key={item.id}>
              <Td className="font-mono text-xs">{item.storage_path}</Td>
              <Td><Link href={`/events/${item.event.slug}`} className="hover:underline">{item.event.title}</Link></Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  <AdminAction action={reviewMediaAction.bind(null, 'event_media', item.id, true)} label={t('admin.approve')} variant="primary" />
                  <AdminAction action={reviewMediaAction.bind(null, 'event_media', item.id, false)} label={t('admin.reject')} variant="danger" requireNote />
                </div>
              </Td>
            </tr>
          ))}
        </DataTable>
      </section>
    </>
  );
}

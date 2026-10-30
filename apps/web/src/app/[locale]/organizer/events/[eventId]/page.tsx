import { getEventById, listEventAnnouncements } from '@tamurt/api-client';
import { isCurrencyCode } from '@tamurt/core';
import { ExternalLink, Pencil } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AnnouncementForm } from '@/components/organizer/announcement-form';
import { DemoOffersManager } from '@/components/organizer/demo-offers-manager';
import { EventStatusActions } from '@/components/organizer/event-status-actions';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card, StatCard } from '@/components/ui/card';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort, eventRange, money } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getMembership } from '@/lib/organizer';
import { getSupabase } from '@/lib/session';
import { eventStatusTone } from '@/lib/status';
import { firstParam } from '@/lib/utils';

interface EventStats {
  totals: { views: number; favorites: number; registrations: number; capacity: number | null };
  registrations: { display_name: string; quantity: number; created_at: string }[] | null;
  sales_by_offer: { offer_id: string; offer_name: string; environment: string; tickets: number; revenue_minor: number; currency: string }[] | null;
}

export default async function ManageEventPage({ params, searchParams }: PageProps<'/[locale]/organizer/events/[eventId]'>) {
  const { locale, eventId } = (await params) as { locale: AppLocale; eventId: string };
  setRequestLocale(locale);
  await requireViewer(locale, `/organizer/events/${eventId}`);
  const supabase = await getSupabase();
  const event = /^[0-9a-f-]{36}$/i.test(eventId) ? await getEventById(supabase, eventId) : null;
  if (!event) notFound();
  const membership = await getMembership(event.organizer_id);
  if (!membership) notFound();
  const t = await getTranslations();
  const [statsResult, announcements] = await Promise.all([
    membership.can('view_analytics') ? supabase.rpc('organizer_event_stats', { p_event_id: event.id }) : Promise.resolve({ data: null }),
    listEventAnnouncements(supabase, event.id).catch(() => []),
  ]);
  const stats = statsResult.data as EventStats | null;
  const saved = firstParam((await searchParams).saved);
  const currency = event.currency && isCurrencyCode(event.currency) ? event.currency : null;
  const editable = membership.can('manage_events') && !['cancelled', 'archived'].includes(event.status);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href={`/organizer/${event.organizer_id}/events`} className="hover:underline">← {membership.organizer.name}</Link>}
        title={event.title}
        subtitle={eventRange(event.starts_at, event.ends_at, event.timezone, locale, event.country_code)}
        actions={
          <>
            {editable ? <Link href={`/organizer/events/${event.id}/edit`} className={buttonClasses({ variant: 'outline' })}><Pencil className="h-4 w-4" aria-hidden />{t('common.edit')}</Link> : null}
            <Link href={`/events/${event.slug}`} className={buttonClasses({ variant: 'ghost' })}>{t('organizer.publicPage')}<ExternalLink className="h-4 w-4" aria-hidden /></Link>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={eventStatusTone(event.status)}>{t(`organizer.eventStatuses.${event.status}`)}</Badge>
        {event.is_demo ? <Badge tone="demo">{t('app.demoBadge')}</Badge> : null}
        <Badge>{t(`eventForm.visibilities.${event.visibility}`)}</Badge>
      </div>
      {saved === 'published' ? <Alert tone="success">{t('eventForm.published')}</Alert> : saved === 'pending_review' ? <Alert tone="info">{t('eventForm.submitted')}</Alert> : saved === 'draft' ? <Alert tone="info">{t('eventForm.draftSaved')}</Alert> : null}
      {event.moderation_note && ['rejected', 'pending_review', 'draft'].includes(event.status) ? <Alert tone="warning">{t('organizer.moderationNote', { note: event.moderation_note })}</Alert> : null}
      {membership.can('manage_events') ? <Card><EventStatusActions eventId={event.id} status={event.status} verified={membership.organizer.verification_status === 'verified'} /></Card> : null}
      {stats ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label={t('organizer.stats.views')} value={stats.totals.views} />
          <StatCard label={t('organizer.stats.favorites')} value={stats.totals.favorites} />
          <StatCard label={t('organizer.stats.registrations')} value={stats.totals.registrations} hint={stats.totals.capacity ? `/ ${stats.totals.capacity}` : undefined} />
          <StatCard label={t('organizer.stats.ticketsDemo')} value={(stats.sales_by_offer ?? []).filter((row) => row.environment === 'demo').reduce((sum, row) => sum + Number(row.tickets), 0)} />
        </div>
      ) : null}
      {event.registration_mode === 'tickets' && !event.is_free && currency && membership.can('manage_events') ? (
        <Card>
          <SectionHeader title={t('event.tickets')} />
          <DemoOffersManager
            eventId={event.id}
            currency={currency}
            offers={event.offers.map((offer) => ({ id: offer.id, name: offer.name, faceValueMinor: offer.face_value_minor, feeMinor: offer.provider_fee_minor, status: offer.status, available: offer.available_estimate }))}
          />
        </Card>
      ) : null}
      {stats?.sales_by_offer?.length ? (
        <Card>
          <SectionHeader title={t('organizer.stats.byOffer')} />
          <ul className="divide-y divide-line text-sm">
            {stats.sales_by_offer.map((row) => (
              <li key={`${row.offer_id}-${row.environment}`} className="flex flex-wrap items-center gap-3 py-2">
                <span className="min-w-0 flex-1 font-medium">{row.offer_name}</span>
                {row.environment === 'demo' ? <Badge tone="demo">{t('app.demoBadge')}</Badge> : null}
                <span className="tabular-nums">{row.tickets}</span>
                <span className="font-semibold tabular-nums">{money(Number(row.revenue_minor), row.currency, locale)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {event.registration_mode === 'free_registration' && stats?.registrations ? (
        <Card>
          <SectionHeader title={t('organizer.registrationsList')} />
          {stats.registrations.length ? (
            <ul className="divide-y divide-line text-sm">
              {stats.registrations.map((row, index) => (
                <li key={index} className="flex justify-between gap-3 py-2"><span>{row.display_name} × {row.quantity}</span><span className="text-subtle">{dateTimeShort(row.created_at, locale)}</span></li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">{t('organizer.noRegistrations')}</p>
          )}
        </Card>
      ) : null}
      <Card className="space-y-4">
        <SectionHeader title={t('organizer.announcements')} />
        {announcements.length ? (
          <ul className="space-y-2">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="rounded-lg bg-sunken p-3 text-sm">
                <p className="font-semibold">{announcement.title}</p>
                <p className="whitespace-pre-line text-muted">{announcement.body}</p>
                <p className="mt-1 text-xs text-subtle">{dateTimeShort(announcement.created_at, locale)}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {membership.can('post_announcements') && event.status === 'published' ? <AnnouncementForm eventId={event.id} /> : null}
      </Card>
    </div>
  );
}

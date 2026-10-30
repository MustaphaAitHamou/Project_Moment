import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FeedbackStatusSelect, InviteByEmailForm, InviteFromWaitlist, RevokeBetaInvitation } from '@/components/admin/beta-admin';
import { DataTable, Td } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, StatCard } from '@/components/ui/card';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort } from '@/lib/format';
import { requireStaffViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

interface BetaStats {
  waitlist_by_status: Record<string, number>;
  invitations_sent: number;
  invitations_redeemed: number;
  testers: number;
  max_testers: number;
  average_rating: number | null;
}

export default async function AdminBetaPage({ params }: PageProps<'/[locale]/admin/beta'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireStaffViewer(locale, '/admin/beta');
  const t = await getTranslations();
  const supabase = await getSupabase();
  const [stats, waitlist, invitations, feedback] = await Promise.all([
    supabase.rpc('beta_stats'),
    supabase.from('beta_waitlist').select('id, email, full_name, country_code, platforms, status, motivation, created_at').in('status', ['verified', 'pending_verification']).order('status', { ascending: false }).order('created_at').limit(200),
    supabase.from('beta_invitations').select('id, email, code_hint, expires_at, redeemed_at, revoked_at, created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('beta_feedback').select('id, kind, title, message, rating, platform, screen, status, created_at').order('created_at', { ascending: false }).limit(100),
  ]);
  const s = (stats.data ?? {}) as Partial<BetaStats>;
  return (
    <>
      <PageHeader title={t('admin.beta')} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t('admin.stats.beta_testers')} value={`${s.testers ?? 0} / ${s.max_testers ?? 0}`} />
        <StatCard label={t('admin.stats.beta_waitlist')} value={Object.values(s.waitlist_by_status ?? {}).reduce((a, b) => a + Number(b), 0)} />
        <StatCard label={t('admin.inviteTester')} value={`${s.invitations_redeemed ?? 0} / ${s.invitations_sent ?? 0}`} />
        <StatCard label={t('beta.feedbackRating')} value={s.average_rating ? Number(s.average_rating).toFixed(1) : '—'} />
      </div>
      <Card>
        <SectionHeader title={t('admin.inviteTester')} />
        <InviteByEmailForm />
      </Card>
      <section>
        <SectionHeader title={t('beta.joinTitle')} />
        <DataTable head={[t('beta.fullName'), t('beta.platforms'), t('common.status'), t('common.actions')]} empty={waitlist.data?.length ? undefined : t('common.empty')}>
          {(waitlist.data ?? []).map((entry) => (
            <tr key={entry.id}>
              <Td><span className="font-semibold">{entry.full_name}</span><br /><span className="text-xs text-subtle">{entry.email} · {entry.country_code} · {dateTimeShort(entry.created_at, locale)}</span>{entry.motivation ? <p className="mt-1 max-w-sm text-xs text-muted">{entry.motivation}</p> : null}</Td>
              <Td>{entry.platforms.join(', ')}</Td>
              <Td><Badge tone={entry.status === 'verified' ? 'success' : 'neutral'}>{entry.status}</Badge></Td>
              <Td>{entry.status === 'verified' ? <InviteFromWaitlist waitlistId={entry.id} /> : null}</Td>
            </tr>
          ))}
        </DataTable>
      </section>
      <section>
        <SectionHeader title={t('organizer.pendingInvitations')} />
        <DataTable head={[t('beta.email'), t('beta.code'), t('common.status'), t('common.actions')]} empty={invitations.data?.length ? undefined : t('common.empty')}>
          {(invitations.data ?? []).map((invitation) => {
            const state = invitation.revoked_at ? 'revoked' : invitation.redeemed_at ? 'redeemed' : new Date(invitation.expires_at) < new Date() ? 'expired' : 'pending';
            return (
              <tr key={invitation.id}>
                <Td>{invitation.email ?? '—'}<br /><span className="text-xs text-subtle">{dateTimeShort(invitation.created_at, locale)}</span></Td>
                <Td className="font-mono">…{invitation.code_hint}</Td>
                <Td><Badge tone={state === 'redeemed' ? 'success' : state === 'pending' ? 'info' : 'neutral'}>{state}</Badge></Td>
                <Td>{state === 'pending' ? <RevokeBetaInvitation invitationId={invitation.id} /> : null}</Td>
              </tr>
            );
          })}
        </DataTable>
      </section>
      <section>
        <SectionHeader title={t('beta.myFeedback')} />
        <DataTable head={[t('beta.feedbackKind'), t('common.description'), t('common.status')]} empty={feedback.data?.length ? undefined : t('common.empty')}>
          {(feedback.data ?? []).map((item) => (
            <tr key={item.id}>
              <Td><Badge tone="secondary">{t(`beta.feedbackKinds.${item.kind}` as 'beta.feedbackKinds.bug')}</Badge><br /><span className="text-xs text-subtle">{item.platform} · {dateTimeShort(item.created_at, locale)}</span></Td>
              <Td><span className="font-semibold">{item.title ?? (item.rating ? '★'.repeat(item.rating) : '—')}</span><p className="max-w-md text-xs text-muted">{item.message}</p>{item.screen ? <p className="text-xs text-subtle">{item.screen}</p> : null}</Td>
              <Td><FeedbackStatusSelect feedbackId={item.id} status={item.status} /></Td>
            </tr>
          ))}
        </DataTable>
      </section>
    </>
  );
}

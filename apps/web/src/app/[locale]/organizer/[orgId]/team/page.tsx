import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { InviteMemberForm, MemberControls, RevokeInvitationButton } from '@/components/organizer/team-manager';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getMembership } from '@/lib/organizer';
import { getSupabase } from '@/lib/session';

export default async function TeamPage({ params }: PageProps<'/[locale]/organizer/[orgId]/team'>) {
  const { locale, orgId } = (await params) as { locale: AppLocale; orgId: string };
  setRequestLocale(locale);
  await requireViewer(locale, `/organizer/${orgId}/team`);
  const membership = await getMembership(orgId);
  if (!membership) notFound();
  const t = await getTranslations();
  const supabase = await getSupabase();
  const canManage = membership.can('manage_team');
  const [team, invitations] = await Promise.all([
    supabase.rpc('organizer_team', { p_organizer_id: orgId }),
    canManage ? supabase.from('organizer_invitations').select('id, email, role, created_at').eq('organizer_id', orgId).is('accepted_at', null).is('revoked_at', null) : Promise.resolve({ data: [] as { id: string; email: string; role: string; created_at: string }[] }),
  ]);
  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader title={t('organizer.teamMembers')} />
        <ul className="divide-y divide-line">
          {(team.data ?? []).map((member) => (
            <li key={member.user_id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-sm font-bold text-white">{member.display_name.slice(0, 1)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{member.display_name}{member.is_me ? ' ✓' : ''}</span>
                <span className="block text-xs text-subtle">{t(`organizer.roleDescriptions.${member.role}`)}</span>
              </span>
              <Badge tone="secondary">{t(`organizer.roles.${member.role}`)}</Badge>
              <MemberControls organizerId={orgId} userId={member.user_id} role={member.role} canManage={canManage && !member.is_me} isMe={member.is_me} />
            </li>
          ))}
        </ul>
      </Card>
      {canManage ? (
        <>
          <Card>
            <SectionHeader title={t('organizer.inviteMember')} />
            <InviteMemberForm organizerId={orgId} />
          </Card>
          <Card>
            <SectionHeader title={t('organizer.pendingInvitations')} />
            {invitations.data?.length ? (
              <ul className="divide-y divide-line text-sm">
                {invitations.data.map((invitation) => (
                  <li key={invitation.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1 font-medium">{invitation.email}</span>
                    <Badge>{t(`organizer.roles.${invitation.role as 'editor'}`)}</Badge>
                    <span className="text-xs text-subtle">{dateTimeShort(invitation.created_at, locale)}</span>
                    <RevokeInvitationButton invitationId={invitation.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">{t('common.empty')}</p>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

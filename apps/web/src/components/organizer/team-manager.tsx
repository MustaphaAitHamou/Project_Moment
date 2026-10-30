'use client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input, Select } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useRouter } from '@/i18n/navigation';
import { acceptInvitationAction, removeMemberAction, revokeInvitationAction, updateMemberRoleAction } from '@/lib/actions/organizer';

const ROLES = ['owner', 'admin', 'editor', 'analyst'] as const;

export function InviteMemberForm({ organizerId }: { organizerId: string }) {
  const t = useTranslations();
  const api = useApi();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'analyst'>('editor');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          await api.organizers.invite(organizerId, { email: email.trim(), role });
          setEmail('');
          setMessage({ ok: true, text: t('organizer.inviteSent') });
          router.refresh();
        } catch (caught) {
          setMessage({ ok: false, text: errorMessage(caught, t('common.unknownError')) });
        }
        setBusy(false);
      }}
    >
      <Field label={t('organizer.inviteEmail')} htmlFor="invite-email"><Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label={t('organizer.inviteRole')} htmlFor="invite-role">
        <Select id="invite-role" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
          {(['admin', 'editor', 'analyst'] as const).map((value) => <option key={value} value={value}>{t(`organizer.roles.${value}`)}</option>)}
        </Select>
      </Field>
      <Button type="submit" loading={busy}>{t('organizer.inviteMember')}</Button>
      {message ? <Alert tone={message.ok ? 'success' : 'danger'} className="sm:col-span-3">{message.text}</Alert> : null}
    </form>
  );
}

export function MemberControls({ organizerId, userId, role, canManage, isMe }: { organizerId: string; userId: string; role: string; canManage: boolean; isMe: boolean }) {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (operation: () => Promise<{ ok: boolean; message?: string }>) =>
    startTransition(async () => {
      const result = await operation();
      if (result.ok) {
        setError(null);
        router.refresh();
      } else setError(result.message ?? t('common.unknownError'));
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canManage ? (
        <Select aria-label={t('organizer.inviteRole')} value={role} disabled={pending} className="w-40 py-1.5" onChange={(e) => run(() => updateMemberRoleAction(organizerId, userId, e.target.value))}>
          {ROLES.map((value) => <option key={value} value={value}>{t(`organizer.roles.${value}`)}</option>)}
        </Select>
      ) : null}
      {canManage || isMe ? (
        <Button size="sm" variant="ghost" loading={pending} onClick={() => run(() => removeMemberAction(organizerId, userId))}>{isMe ? t('organizer.leave') : t('organizer.removeMember')}</Button>
      ) : null}
      {error ? <span className="text-xs text-danger" role="alert">{error}</span> : null}
    </div>
  );
}

export function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const t = useTranslations('organizer');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button size="sm" variant="ghost" loading={pending} onClick={() => startTransition(async () => { await revokeInvitationAction(invitationId); router.refresh(); })}>{t('revokeInvitation')}</Button>;
}

export function AcceptInvitationButton({ invitationId }: { invitationId: string }) {
  const t = useTranslations('organizer');
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" loading={pending} onClick={() => startTransition(async () => { const r = await acceptInvitationAction(invitationId); setMessage(r.ok ? t('invitationAccepted') : r.message); router.refresh(); })}>{t('acceptInvitation')}</Button>
      {message ? <span className="text-xs text-muted" role="status">{message}</span> : null}
    </span>
  );
}

import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AdminAction } from '@/components/admin/admin-action';
import { DataTable, Td } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { setRoleAction, setSuspensionAction } from '@/lib/actions/admin';
import { dateTimeShort } from '@/lib/format';
import { requireStaffViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';
import { firstParam } from '@/lib/utils';

const ROLES = ['beta_tester', 'organizer', 'moderator', 'admin'] as const;

export default async function AdminUsersPage({ params, searchParams }: PageProps<'/[locale]/admin/users'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const viewer = await requireStaffViewer(locale, '/admin/users');
  const t = await getTranslations();
  const query = await searchParams;
  const q = (firstParam(query.q) ?? '').trim().slice(0, 80);
  const page = Math.max(1, Number(firstParam(query.page) ?? 1) || 1);
  const { data: users } = await (await getSupabase()).rpc('admin_list_users', { p_query: q || undefined, p_limit: 50, p_offset: (page - 1) * 50 });
  return (
    <>
      <PageHeader title={t('admin.users')} subtitle={users?.[0] ? `${users[0].total_count}` : undefined} />
      <form method="get" className="flex gap-2"><input name="q" defaultValue={q} placeholder={t('admin.searchUsers')} className="w-72 rounded-md border border-line-strong bg-surface px-3 py-2 text-sm" /><button className="rounded-full bg-primary px-4 text-sm font-semibold text-on-primary">{t('common.search')}</button></form>
      <DataTable head={[t('common.name'), t('account.roles'), t('common.status'), viewer.isAdmin ? t('common.actions') : '']} empty={users?.length ? undefined : t('common.empty')}>
        {(users ?? []).map((user) => (
          <tr key={user.id}>
            <Td><span className="font-semibold">{user.display_name}</span><br /><span className="text-xs text-subtle">{user.email} · {dateTimeShort(user.created_at, locale)}{user.email_confirmed_at ? ' · ✓' : ''}</span></Td>
            <Td><div className="flex flex-wrap gap-1">{user.roles.map((role) => <Badge key={role} tone={role === 'admin' ? 'danger' : 'secondary'}>{role}</Badge>)}</div></Td>
            <Td>{user.is_suspended ? <Badge tone="danger">{t('admin.suspend')}</Badge> : <Badge tone="success">OK</Badge>}</Td>
            <Td>
              {viewer.isAdmin && user.id !== viewer.id ? (
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((role) => {
                    const has = user.roles.includes(role);
                    return <AdminAction key={role} action={setRoleAction.bind(null, user.id, role, !has)} label={`${has ? '−' : '+'} ${role}`} variant={has ? 'ghost' : 'outline'} />;
                  })}
                  <AdminAction action={setSuspensionAction.bind(null, user.id, !user.is_suspended)} label={user.is_suspended ? t('admin.unsuspend') : t('admin.suspend')} variant={user.is_suspended ? 'outline' : 'danger'} requireNote={!user.is_suspended} />
                </div>
              ) : null}
            </Td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}

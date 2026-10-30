import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, Td } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort } from '@/lib/format';
import { requireStaffViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';
import { firstParam } from '@/lib/utils';

/** Journal d'audit (immuable : ni modification ni suppression possibles, y compris par les administrateurs). */
export default async function AuditPage({ params, searchParams }: PageProps<'/[locale]/admin/audit'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireStaffViewer(locale, '/admin/audit');
  const t = await getTranslations('admin');
  const entity = (firstParam((await searchParams).entity) ?? '').replace(/[^a-z_]/g, '').slice(0, 60);
  let query = (await getSupabase()).from('audit_logs').select('id, actor_id, actor_role, action, entity_type, entity_id, changes, created_at').order('created_at', { ascending: false }).limit(200);
  if (entity) query = query.eq('entity_type', entity);
  const { data: logs } = await query;
  return (
    <>
      <PageHeader title={t('audit')} />
      <form method="get" className="flex gap-2"><input name="entity" defaultValue={entity} placeholder={t('auditEntity')} className="w-64 rounded-md border border-line-strong bg-surface px-3 py-2 text-sm" /><button className="rounded-full bg-primary px-4 text-sm font-semibold text-on-primary">OK</button></form>
      <DataTable head={[t('auditAction'), t('auditEntity'), t('auditActor'), t('auditChanges')]}>
        {(logs ?? []).map((log) => (
          <tr key={log.id}>
            <Td><Badge tone="secondary">{log.action}</Badge><br /><span className="text-xs text-subtle">{dateTimeShort(log.created_at, locale)}</span></Td>
            <Td><span className="font-mono text-xs">{log.entity_type}</span><br /><span className="font-mono text-[10px] text-subtle">{log.entity_id}</span></Td>
            <Td className="font-mono text-[10px] text-subtle">{log.actor_role ?? '—'}<br />{log.actor_id ?? 'system'}</Td>
            <Td><pre className="max-h-32 max-w-md overflow-auto whitespace-pre-wrap rounded bg-sunken p-2 font-mono text-[10px]">{JSON.stringify(log.changes, null, 1)?.slice(0, 1200)}</pre></Td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}

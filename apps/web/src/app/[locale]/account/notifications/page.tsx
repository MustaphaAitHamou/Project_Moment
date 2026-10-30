import { listNotifications } from '@tamurt/api-client';
import { notifications as notificationService } from '@tamurt/server';
import { Bell } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { MarkReadButton } from '@/components/account/mark-read-button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { dateTimeShort } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';
import { cn } from '@/lib/utils';

export default async function NotificationsPage({ params }: PageProps<'/[locale]/account/notifications'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireViewer(locale, '/account/notifications');
  const t = await getTranslations();
  const notifications = await listNotifications(await getSupabase(), 100);
  const unread = notifications.filter((item) => !item.read_at);
  return (
    <>
      <PageHeader title={t('notifications.title')} actions={unread.length ? <MarkReadButton /> : null} />
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title={t('notifications.empty')} />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {notifications.map((item) => {
            // Rendu dans la langue de l'interface à partir du type et des données (titres non figés en base).
            const rendered = notificationService.renderNotification(locale, item.type, (item.data ?? {}) as Record<string, unknown>, item.title, item.body);
            const href = item.link && item.link.startsWith('/') ? item.link.replace(/^\/(fr|en|ar)(?=\/|$)/, '') || '/' : null;
            return (
              <li key={item.id} className={cn('flex gap-3 p-4', !item.read_at && 'bg-primary-soft/40')}>
                <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', item.read_at ? 'bg-transparent' : 'bg-primary')} aria-label={item.read_at ? undefined : t('notifications.unread')} />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.is_demo ? <Badge tone="demo">{t('notifications.demoTag')}</Badge> : null}
                    <span className="text-xs text-subtle">{dateTimeShort(item.created_at, locale)}</span>
                  </div>
                  {href ? <Link href={href} className="block font-semibold hover:underline">{rendered.title}</Link> : <p className="font-semibold">{rendered.title}</p>}
                  {rendered.body ? <p className="text-sm text-muted">{rendered.body}</p> : null}
                </div>
                {!item.read_at ? <MarkReadButton ids={[item.id]} /> : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

'use client';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin', key: 'dashboard', exact: true },
  { href: '/admin/moderation', key: 'moderationQueue' },
  { href: '/admin/reports', key: 'reports' },
  { href: '/admin/events', key: 'events' },
  { href: '/admin/organizers', key: 'organizers' },
  { href: '/admin/users', key: 'users' },
  { href: '/admin/resale', key: 'resale' },
  { href: '/admin/orders', key: 'orders' },
  { href: '/admin/beta', key: 'beta' },
  { href: '/admin/providers', key: 'providers' },
  { href: '/admin/geo', key: 'geo' },
  { href: '/admin/audit', key: 'audit' },
  { href: '/admin/settings', key: 'settings' },
] as const;

export function AdminNav() {
  const t = useTranslations('admin');
  const pathname = usePathname();
  return (
    <nav aria-label={t('title')} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {ITEMS.map((item) => {
          const active = 'exact' in item ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('block whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold', active ? 'bg-secondary text-white' : 'text-muted hover:bg-sunken hover:text-fg')}>
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

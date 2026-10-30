'use client';
import { Bell, CalendarDays, Heart, Receipt, Repeat2, Settings, Sparkles, Ticket, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/account', key: 'account', icon: User, exact: true },
  { href: '/account/tickets', key: 'tickets', icon: Ticket },
  { href: '/account/orders', key: 'orders', icon: Receipt },
  { href: '/account/favorites', key: 'favorites', icon: Heart },
  { href: '/account/agenda', key: 'myAgenda', icon: CalendarDays },
  { href: '/account/notifications', key: 'notifications', icon: Bell },
  { href: '/account/resale', key: 'resale', icon: Repeat2 },
  { href: '/account/beta', key: 'beta', icon: Sparkles },
  { href: '/account/settings', key: 'settings', icon: Settings },
] as const;

export function AccountNav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  return (
    <nav aria-label={t('account')} className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-1 lg:flex-col">
        {ITEMS.map((item) => {
          const active = 'exact' in item ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={active ? 'page' : undefined} className={cn('flex items-center gap-2.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors lg:rounded-lg', active ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-sunken hover:text-fg')}>
                <Icon className="h-4 w-4" aria-hidden />
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

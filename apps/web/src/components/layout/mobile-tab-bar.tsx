'use client';
import { CalendarDays, Compass, Heart, Plus, Ticket, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/', key: 'discover', icon: Compass, match: (p: string) => p === '/' || p.startsWith('/search') || p.startsWith('/events') || p.startsWith('/map') },
  { href: '/agenda', key: 'agenda', icon: CalendarDays, match: (p: string) => p.startsWith('/agenda') || p.startsWith('/account/agenda') },
  { href: '/account/tickets', key: 'tickets', icon: Ticket, match: (p: string) => p.startsWith('/account/tickets') || p.startsWith('/account/orders') },
  { href: '/account/favorites', key: 'favorites', icon: Heart, match: (p: string) => p.startsWith('/account/favorites') },
  { href: '/account', key: 'profile', icon: User, match: (p: string) => p === '/account' || p.startsWith('/account/settings') || p.startsWith('/account/notifications') },
] as const;

/** Barre d'onglets mobile : même structure que l'application iOS/Android (5 onglets + création). */
export function MobileTabBar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [first, second, ...rest] = TABS;
  const renderTab = (tab: (typeof TABS)[number]) => {
    const active = tab.match(pathname);
    const Icon = tab.icon;
    return (
      <Link key={tab.key} href={tab.href} className={cn('flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium', active ? 'text-primary' : 'text-muted')} aria-current={active ? 'page' : undefined}>
        <Icon className="h-5 w-5" aria-hidden strokeWidth={active ? 2.4 : 2} />
        {t(tab.key)}
      </Link>
    );
  };
  return (
    <nav aria-label={t('discover')} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch">
        {renderTab(first)}
        {renderTab(second)}
        <Link href="/organizer/events/new" className="relative -mt-5 flex flex-1 flex-col items-center gap-0.5 text-[11px] font-medium text-muted" aria-label={t('create')}>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary text-on-primary shadow-glow">
            <Plus className="h-6 w-6" aria-hidden />
          </span>
        </Link>
        {rest.map(renderTab)}
      </div>
    </nav>
  );
}

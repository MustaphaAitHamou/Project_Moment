'use client';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function OrganizerTabs({ organizerId }: { organizerId: string }) {
  const t = useTranslations('organizer');
  const pathname = usePathname();
  const base = `/organizer/${organizerId}`;
  const tabs = [
    { href: base, label: t('overview'), active: pathname === base },
    { href: `${base}/events`, label: t('events'), active: pathname.startsWith(`${base}/events`) },
    { href: `${base}/team`, label: t('team'), active: pathname.startsWith(`${base}/team`) },
    { href: `${base}/settings`, label: t('settings'), active: pathname.startsWith(`${base}/settings`) },
  ];
  return (
    <nav className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4" aria-label={t('dashboardTitle')}>
      <ul className="flex gap-1">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link href={tab.href} aria-current={tab.active ? 'page' : undefined} className={cn('inline-block whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold', tab.active ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-fg')}>
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

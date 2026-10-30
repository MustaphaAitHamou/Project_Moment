'use client';
import { LOCALE_INFO, LOCALES } from '@tamurt/i18n';
import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = Object.fromEntries(searchParams.entries());
  return (
    <details className={cn('group relative', className)}>
      <summary className="grid h-10 cursor-pointer list-none place-items-center rounded-full px-2.5 text-sm font-semibold text-muted transition-colors hover:bg-sunken hover:text-fg [&::-webkit-details-marker]:hidden" aria-label={t('language')}>
        <span className="flex items-center gap-1.5">
          <Languages className="h-5 w-5" aria-hidden />
          <span className="uppercase">{locale}</span>
        </span>
      </summary>
      <ul className="absolute end-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-line bg-raised py-1 shadow-lg">
        {LOCALES.map((code) => (
          <li key={code}>
            <Link
              href={{ pathname, query }}
              locale={code}
              lang={code}
              dir={LOCALE_INFO[code].direction}
              className={cn('flex items-center justify-between px-3.5 py-2 text-sm hover:bg-sunken', code === locale && 'font-semibold text-primary')}
              aria-current={code === locale ? 'true' : undefined}
            >
              {LOCALE_INFO[code].nativeName}
              {LOCALE_INFO[code].status === 'draft_unverified' ? <span className="text-xs text-subtle">β</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

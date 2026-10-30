import { Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

/** Formulaire de recherche (GET, fonctionne sans JavaScript). */
export function SearchBox({ defaultValue, className, size = 'md', hidden }: { defaultValue?: string; className?: string; size?: 'md' | 'lg'; hidden?: Record<string, string | undefined> }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <form action={`/${locale}/search`} method="get" role="search" className={cn('relative flex w-full items-center', className)}>
      {Object.entries(hidden ?? {}).map(([name, value]) => (value ? <input key={name} type="hidden" name={name} value={value} /> : null))}
      <Search className="pointer-events-none absolute start-4 h-5 w-5 text-subtle" aria-hidden />
      <input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={t('home.searchPlaceholder')}
        aria-label={t('nav.search')}
        maxLength={120}
        className={cn(
          'w-full rounded-full border border-line-strong bg-surface ps-12 pe-28 text-fg shadow-sm placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20',
          size === 'lg' ? 'h-14 text-base' : 'h-12 text-sm',
        )}
      />
      <button type="submit" className={cn('absolute end-1.5 rounded-full bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover', size === 'lg' ? 'h-11 text-sm' : 'h-9 text-sm')}>
        {t('common.search')}
      </button>
    </form>
  );
}

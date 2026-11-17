import { COUNTRY_CODES, type CountryCode } from '@tamurt/core';
import { useTranslations } from 'next-intl';
import { CountryFlag, GlobeMark } from '@/components/ui/country-flag';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function CountryChips({ active, pathname = '/', extraQuery = {} }: { active: CountryCode | null; pathname?: string; extraQuery?: Record<string, string> }) {
  const t = useTranslations();
  const chip = (selected: boolean) =>
    cn('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors', selected ? 'border-fg bg-fg text-bg' : 'border-line-strong bg-surface text-fg hover:bg-sunken');
  return (
    <nav aria-label={t('home.chooseCountry')} className="flex flex-wrap gap-2">
      <Link href={{ pathname, query: { ...extraQuery, country: 'all' } }} className={chip(active === null)} aria-current={active === null ? 'true' : undefined}>
        <GlobeMark className={active === null ? 'text-bg' : 'text-accent'} /> {t('common.allCountries')}
      </Link>
      {COUNTRY_CODES.map((code) => (
        <Link key={code} href={{ pathname, query: { ...extraQuery, country: code } }} className={chip(active === code)} aria-current={active === code ? 'true' : undefined}>
          <CountryFlag code={code} /> {t(`countries.${code}`)}
        </Link>
      ))}
    </nav>
  );
}

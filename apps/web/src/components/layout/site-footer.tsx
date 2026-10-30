import { EVENT_CATEGORY_SLUGS, COUNTRY_CODES } from '@tamurt/core';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Logo } from './logo';

export async function SiteFooter() {
  const t = await getTranslations();
  const link = 'text-sm text-muted hover:text-fg';
  return (
    <footer className="mt-16 border-t border-line bg-surface pb-24 md:pb-0">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <Logo label={t('app.name')} />
          <p className="max-w-xs text-sm text-muted">{t('app.description')}</p>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">{t('nav.categories')}</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
            {EVENT_CATEGORY_SLUGS.slice(0, 8).map((slug) => (
              <li key={slug}><Link href={`/categories/${slug}`} className={link}>{t(`categories.${slug}`)}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">{t('nav.countries')}</h2>
          <ul className="space-y-2">
            {COUNTRY_CODES.map((code) => (
              <li key={code}><Link href={`/countries/${code.toLowerCase()}`} className={link}>{t(`countries.${code}`)}</Link></li>
            ))}
            <li><Link href="/archive" className={link}>{t('search.pastEvents')}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-sm font-bold">{t('app.name')}</h2>
          <ul className="space-y-2">
            <li><Link href="/organizer" className={link}>{t('nav.organizer')}</Link></li>
            <li><Link href="/beta" className={link}>{t('nav.beta')}</Link></li>
            <li><Link href="/support" className={link}>{t('nav.support')}</Link></li>
            <li><Link href="/legal/terms" className={link}>{t('legal.terms')}</Link></li>
            <li><Link href="/legal/privacy" className={link}>{t('legal.privacy')}</Link></li>
            <li><Link href="/legal/cookies" className={link}>{t('legal.cookies')}</Link></li>
            <li><Link href="/legal/notice" className={link}>{t('legal.legalNotice')}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="container-page py-5 text-xs text-subtle">© {new Date().getUTCFullYear()} {t('app.publisher')} — {t('app.tagline')}</p>
      </div>
    </footer>
  );
}

import '../globals.css';
import { LOCALE_INFO } from '@tamurt/i18n';
import type { Metadata, Viewport } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { IBM_Plex_Sans_Arabic, Kaushan_Script, Noto_Sans, Tilt_Neon } from 'next/font/google';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { ArabicDraftNotice, DemoBanner } from '@/components/layout/notices';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import type { ThemePreference } from '@/components/layout/theme-toggle';
import { routing } from '@/i18n/routing';
import { isIndexable, siteUrl } from '@/lib/env';
import { getPublicConfig, getViewer } from '@/lib/session';

// DA Tamurt Services : Tilt Neon (un tube de néon) pour l'interface, Kaushan Script (l'enseigne) pour les grands titres.
// Sans police de repli ajustée, pour que les lettres manquantes passent à Noto Sans (ɛ, ɣ…) et non à une police système.
const display = Tilt_Neon({ subsets: ['latin', 'latin-ext'], variable: '--font-display-src', display: 'swap', adjustFontFallback: false });
const moment = Kaushan_Script({ subsets: ['latin', 'latin-ext'], weight: '400', variable: '--font-moment-src', display: 'swap', adjustFontFallback: false });
// Téléchargée seulement si une lettre manque à Tilt Neon.
const fallback = Noto_Sans({ subsets: ['latin-ext'], variable: '--font-fallback-src', display: 'swap', preload: false });
const arabic = IBM_Plex_Sans_Arabic({ subsets: ['arabic'], weight: ['400', '500', '600', '700'], variable: '--font-arabic-src', display: 'swap' });

export async function generateMetadata({ params }: LayoutProps<'/[locale]'>): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: hasLocale(routing.locales, locale) ? locale : routing.defaultLocale, namespace: 'app' });
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${t('name')} — ${t('tagline')}`, template: `%s · ${t('name')}` },
    description: t('description'),
    applicationName: t('name'),
    robots: isIndexable() ? undefined : { index: false, follow: false },
    openGraph: { siteName: t('name'), type: 'website', locale },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#140A2E' },
    { media: '(prefers-color-scheme: dark)', color: '#140A2E' },
  ],
};

export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [viewer, cookieStore, settings, t] = await Promise.all([getViewer(), cookies(), getPublicConfig(), getTranslations('app')]);
  const themeCookie = cookieStore.get('TAMURT_THEME')?.value;
  const theme: ThemePreference = themeCookie === 'light' || themeCookie === 'dark' ? themeCookie : 'system';
  const liveCommerce = settings.commerce?.live_enabled === true && settings.resale?.live_enabled === true;

  return (
    <html
      lang={locale}
      dir={LOCALE_INFO[locale].direction}
      data-theme={theme === 'system' ? undefined : theme}
      className={`${display.variable} ${moment.variable} ${fallback.variable} ${arabic.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col antialiased">
        <a href="#main" className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-semibold text-on-primary focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
          {t('skipToContent')}
        </a>
        <NextIntlClientProvider>
          {liveCommerce ? null : <DemoBanner />}
          {locale === 'ar' ? <ArabicDraftNotice /> : null}
          <SiteHeader viewer={viewer} />
          <main id="main" className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
          <SiteFooter />
          <MobileTabBar />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { routing, type AppLocale } from '@/i18n/routing';
import { siteUrl } from './env';

/** URL absolue d'une page localisée. */
export function absoluteUrl(locale: AppLocale, path: string): string {
  const clean = path === '/' ? '' : path;
  return `${siteUrl()}/${locale}${clean}`;
}

/** Canonique + hreflang (fr, en, ar, x-default). */
export function alternatesFor(locale: AppLocale, path: string): Metadata['alternates'] {
  const languages: Record<string, string> = {};
  for (const code of routing.locales) languages[code] = absoluteUrl(code, path);
  languages['x-default'] = absoluteUrl(routing.defaultLocale, path);
  return { canonical: absoluteUrl(locale, path), languages };
}

export function pageMetadata(options: {
  locale: AppLocale;
  path: string;
  title: string;
  description?: string;
  noindex?: boolean;
  image?: string;
}): Metadata {
  return {
    title: options.title,
    description: options.description,
    alternates: alternatesFor(options.locale, options.path),
    openGraph: {
      title: options.title,
      description: options.description,
      url: absoluteUrl(options.locale, options.path),
      ...(options.image ? { images: [{ url: options.image }] } : {}),
    },
    twitter: { card: options.image ? 'summary_large_image' : 'summary', title: options.title, description: options.description },
    ...(options.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Pages privées (compte, administration, paiement) : jamais indexées. */
export const PRIVATE_METADATA: Metadata = { robots: { index: false, follow: false } };

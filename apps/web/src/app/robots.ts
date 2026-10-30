import type { MetadataRoute } from 'next';
import { isIndexable, siteUrl } from '@/lib/env';

/** Prévisualisations et environnements de test : aucune indexation. */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/auth/', '/*/account', '/*/admin', '/*/checkout', '/*/organizer', '/*/resale/transactions', '/*/auth/', '/*/onboarding', '/*/beta/verify', '/*/beta/redeem'],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}

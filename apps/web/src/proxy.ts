import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { buildContentSecurityPolicy } from './lib/csp';
import { refreshSupabaseSession } from './lib/supabase/proxy';

const handleI18nRouting = createIntlMiddleware(routing);

/**
 * Proxy (ex-middleware) : CSP avec nonce, rafraîchissement de session Supabase, routage des langues.
 * Il ne remplace jamais les contrôles d'accès faits dans les pages et les routes API.
 */
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildContentSecurityPolicy(nonce, { dev: process.env.NODE_ENV === 'development' });

  const applySession = await refreshSupabaseSession(request);

  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);

  // Routes techniques non localisées (callback d'authentification).
  const localized = !request.nextUrl.pathname.startsWith('/auth/');
  const response = localized
    ? handleI18nRouting(new NextRequest(request, { headers }))
    : NextResponse.next({ request: { headers } });

  applySession(response);
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|.*\\..*).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};

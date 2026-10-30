import { EVENT_CATEGORY_SLUGS } from '@tamurt/core';
import { generatePosterSvg } from '@tamurt/ui';
import type { NextRequest } from 'next/server';

/**
 * Affiche générative (SVG déterministe) utilisée quand un événement n'a pas de visuel validé.
 * Le contenu est entièrement produit par notre code : la graine ne sert qu'au hachage.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ seed: string }> }) {
  const { seed } = await params;
  const requested = request.nextUrl.searchParams.get('c') ?? 'other';
  const category = (EVENT_CATEGORY_SLUGS as readonly string[]).includes(requested) ? requested : 'other';
  const width = request.nextUrl.searchParams.get('r') === 'wide' ? 1200 : 800;
  const height = request.nextUrl.searchParams.get('r') === 'wide' ? 630 : 600;
  const svg = generatePosterSvg({ seed: seed.slice(0, 200), category, width, height });
  return new Response(svg, {
    headers: {
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=31536000, immutable',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
      'x-content-type-options': 'nosniff',
    },
  });
}

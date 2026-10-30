/**
 * Politique de sécurité du contenu (CSP) avec nonce par requête pour les scripts.
 * Les styles en ligne restent autorisés (attributs style de React, next/image, MapLibre) :
 * le risque principal (exécution de scripts injectés) est couvert par le nonce + 'strict-dynamic'.
 */
export function buildContentSecurityPolicy(nonce: string, options: { dev: boolean }): string {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
  const supabaseHttp = supabase ? supabase.origin : '';
  const supabaseWs = supabase ? `${supabase.protocol === 'https:' ? 'wss' : 'ws'}://${supabase.host}` : '';
  const tiles = 'https://tiles.openfreemap.org';
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(options.dev ? ["'unsafe-eval'"] : [])],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', supabaseHttp, tiles].filter(Boolean),
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", supabaseHttp, supabaseWs, tiles].filter(Boolean),
    'worker-src': ["'self'", 'blob:'],
    'child-src': ['blob:'],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'manifest-src': ["'self'"],
  };
  const policy = Object.entries(directives).map(([key, values]) => `${key} ${values.join(' ')}`);
  if (!options.dev && supabase?.protocol === 'https:') policy.push('upgrade-insecure-requests');
  return policy.join('; ');
}

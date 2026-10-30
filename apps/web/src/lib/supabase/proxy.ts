import { createServerClient } from '@supabase/ssr';
import type { Database } from '@tamurt/types';
import type { NextRequest, NextResponse } from 'next/server';

interface PendingCookie {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
}

/**
 * Rafraîchit la session Supabase pendant le proxy. Les cookies mis à jour sont écrits sur la
 * requête (pour que les Server Components lisent la nouvelle session) puis, via la fonction
 * retournée, sur la réponse. Ce n'est PAS un contrôle d'accès : chaque page et route API
 * revérifie l'utilisateur côté serveur.
 */
export async function refreshSupabaseSession(request: NextRequest): Promise<(response: NextResponse) => NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pendingCookies: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};
  if (url && anonKey) {
    const supabase = createServerClient<Database>(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          pendingCookies.push(...cookiesToSet);
          Object.assign(pendingHeaders, headers);
        },
      },
    });
    try {
      await supabase.auth.getClaims();
    } catch {
      // Service d'authentification indisponible : la page s'affiche en mode déconnecté.
    }
  }
  return (response) => {
    for (const { name, value, options } of pendingCookies) response.cookies.set(name, value, options);
    for (const [key, value] of Object.entries(pendingHeaders)) response.headers.set(key, value);
    return response;
  };
}

import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@tamurt/types';
import { cookies } from 'next/headers';
import { supabasePublicConfig } from '../env';

/**
 * Client Supabase lié à la session de l'utilisateur (cookies). La RLS s'applique.
 * Dans un Server Component, l'écriture des cookies est impossible : le proxy rafraîchit la session.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabasePublicConfig();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Appelé depuis un Server Component : ignoré (le proxy s'en charge).
        }
      },
    },
  });
}

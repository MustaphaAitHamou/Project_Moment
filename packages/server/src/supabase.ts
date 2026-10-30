import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@tamurt/types';

export type TamurtSupabaseClient = SupabaseClient<Database>;

/** Client « service » (contourne la RLS) : à n'utiliser QUE côté serveur. */
export function createAdminClient(url: string, serviceRoleKey: string): TamurtSupabaseClient {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-client-info': 'tamurt-server' } },
  });
}

/** Client agissant au nom d'un utilisateur (jeton d'accès) : la RLS s'applique pleinement. */
export function createUserClient(url: string, anonKey: string, accessToken: string): TamurtSupabaseClient {
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${accessToken}`, 'x-client-info': 'tamurt-server-user' } },
  });
}

/** Client anonyme sans session (vérification de mot de passe, lectures publiques). */
export function createAnonClient(url: string, anonKey: string): TamurtSupabaseClient {
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@tamurt/types';
import { supabasePublicConfig } from '../env';

/** Client anonyme sans session (sitemap, métadonnées publiques). La RLS publique s'applique. */
export function createSupabasePublicClient() {
  const { url, anonKey } = supabasePublicConfig();
  return createClient<Database>(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@tamurt/types';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Client navigateur (clé publique) : la session est partagée avec le serveur via les cookies. */
export function getSupabaseBrowserClient() {
  browserClient ??= createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return browserClient;
}

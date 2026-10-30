import { createClient } from '@supabase/supabase-js';
import type { Database } from '@tamurt/types';
import { AppState } from 'react-native';
import { env } from './env';
import { createChunkedStore } from './secure-storage';

/** Client Supabase (clé publique) ; session conservée dans le stockage sécurisé de l'appareil. */
export const supabase = createClient<Database>(env.supabaseUrl || 'http://localhost', env.supabaseAnonKey || 'missing-anon-key', {
  auth: {
    storage: createChunkedStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Rafraîchissement du jeton uniquement lorsque l'application est au premier plan.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});

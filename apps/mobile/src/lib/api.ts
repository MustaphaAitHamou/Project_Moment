import { createTamurtApi } from '@tamurt/api-client';
import { env } from './env';
import { supabase } from './supabase';

/** API REST du site (/api/v1) authentifiée par jeton Bearer (jamais par cookie sur mobile). */
export function createApi(locale: string) {
  return createTamurtApi({
    baseUrl: env.apiUrl,
    locale,
    getAccessToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
  });
}

export type MobileApi = ReturnType<typeof createApi>;

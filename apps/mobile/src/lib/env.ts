import Constants from 'expo-constants';

/** Variables publiques (EXPO_PUBLIC_*), intégrées à l'application au moment de la construction. */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, ''),
  appEnv: (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as 'development' | 'preview' | 'production',
  webHost: process.env.EXPO_PUBLIC_WEB_HOST ?? '',
  hasGoogleMapsKey: Boolean((Constants.expoConfig?.extra as { hasGoogleMapsKey?: boolean } | undefined)?.hasGoogleMapsKey),
};

export const isConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey && env.apiUrl);

/** URL publique d'une page du site (partage, ouverture dans le navigateur). */
export function webUrl(locale: string, path: string): string {
  const base = env.webHost ? `https://${env.webHost}` : env.apiUrl;
  return `${base}/${locale}${path}`;
}

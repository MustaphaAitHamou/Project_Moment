import { testEnv } from './helpers';

/** Vérifie que Supabase local est démarré avant d'exécuter les tests d'intégration. */
export default async function setup(): Promise<void> {
  const env = testEnv();
  if (!env.anonKey || !env.serviceRoleKey) {
    throw new Error('Supabase local introuvable. Lancez `pnpm db:start` puis `pnpm db:reset` avant les tests d’intégration.');
  }
  const response = await fetch(`${env.apiUrl}/rest/v1/countries?select=code&limit=1`, {
    headers: { apikey: env.anonKey, authorization: `Bearer ${env.anonKey}` },
  }).catch(() => null);
  if (!response || !response.ok) {
    throw new Error(`API Supabase indisponible sur ${env.apiUrl}. Lancez \`pnpm db:start\`.`);
  }
}

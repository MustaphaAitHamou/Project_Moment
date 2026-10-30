import { z } from 'zod';

/**
 * Variables d'environnement SERVEUR. Aucune valeur secrète par défaut n'est utilisée en production :
 * l'application refuse de démarrer un service si un secret obligatoire manque.
 */
const booleanFromEnv = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((value) => value === 'true' || value === '1');

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.url().default('http://localhost:3000'),
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  /** Secret HMAC pour hacher les codes d'invitation et dériver les références titulaires. */
  TAMURT_SERVER_SECRET: z.string().min(32).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  DEMO_PROVIDER_WEBHOOK_SECRET: z.string().min(16).optional(),
  TICKETING_LIVE_PROVIDERS: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: booleanFromEnv,
  EMAIL_FROM: z.string().optional(),
  /** Liste blanche (domaines ou adresses, séparés par des virgules) pour les environnements de test. */
  EMAIL_ALLOWLIST: z.string().optional(),
  PUSH_NOTIFICATIONS_ENABLED: booleanFromEnv,
  EXPO_ACCESS_TOKEN: z.string().optional(),
  GEOCODING_CONTACT_EMAIL: z.string().optional(),
  SUPPORT_EMAIL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema> & { TAMURT_SERVER_SECRET: string };

/** Secret de développement : uniquement hors production (jamais utilisé en production). */
const DEV_ONLY_SECRET = 'tamurt-dev-only-secret-not-for-production-use';

export function readServerEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  const parsed = serverEnvSchema.parse({
    ...source,
    SUPABASE_URL: source.SUPABASE_URL ?? source.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: source.SUPABASE_ANON_KEY ?? source.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    APP_URL: source.APP_URL ?? source.NEXT_PUBLIC_APP_URL,
  });
  let secret = parsed.TAMURT_SERVER_SECRET;
  if (!secret) {
    if (parsed.NODE_ENV === 'production') {
      throw new Error('TAMURT_SERVER_SECRET est obligatoire en production (32 caractères minimum).');
    }
    secret = DEV_ONLY_SECRET;
  }
  return { ...parsed, TAMURT_SERVER_SECRET: secret };
}

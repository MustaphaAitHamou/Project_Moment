import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@tamurt/types';
import {
  createAdminClient,
  createServerContext,
  createUserClient,
  PostgresDemoInventoryStore,
  readServerEnv,
  SmtpEmailAdapter,
  type AuthUser,
  type ServerContext,
  type TamurtSupabaseClient,
} from '../src';

const repoRoot = resolve(__dirname, '../../..');

export interface TestEnv {
  apiUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  dbUrl: string;
  mailpitUrl: string;
}

let cachedEnv: TestEnv | null = null;

/** Lit la configuration de Supabase local (variables d'environnement ou `supabase status`). */
export function testEnv(): TestEnv {
  if (cachedEnv) return cachedEnv;
  let values: Record<string, string> = {};
  if (!process.env.SUPABASE_TEST_API_URL) {
    const output = execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['supabase', 'status', '-o', 'env'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: process.platform === 'win32',
    });
    values = Object.fromEntries(
      output
        .split('\n')
        .map((line) => /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim()))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => [m[1] as string, m[2] as string]),
    );
  }
  cachedEnv = {
    apiUrl: process.env.SUPABASE_TEST_API_URL ?? values.API_URL ?? 'http://127.0.0.1:54321',
    anonKey: process.env.SUPABASE_TEST_ANON_KEY ?? values.ANON_KEY ?? '',
    serviceRoleKey: process.env.SUPABASE_TEST_SERVICE_ROLE_KEY ?? values.SERVICE_ROLE_KEY ?? '',
    dbUrl: process.env.SUPABASE_TEST_DB_URL ?? values.DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
    mailpitUrl: process.env.SUPABASE_TEST_MAILPIT_URL ?? values.MAILPIT_URL ?? values.INBUCKET_URL ?? 'http://127.0.0.1:54324',
  };
  return cachedEnv;
}

let pool: pg.Pool | null = null;
export function sql(): pg.Pool {
  pool ??= new pg.Pool({ connectionString: testEnv().dbUrl, max: 10 });
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) await pool.end();
  pool = null;
}

export function adminClient(): TamurtSupabaseClient {
  const env = testEnv();
  return createAdminClient(env.apiUrl, env.serviceRoleKey);
}

export function anonClient(): TamurtSupabaseClient {
  const env = testEnv();
  return createClient<Database>(env.apiUrl, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function testContext(overrides: { now?: () => Date } = {}): ServerContext {
  const env = testEnv();
  const serverEnv = readServerEnv({
    NODE_ENV: 'test',
    APP_URL: 'http://localhost:3000',
    SUPABASE_URL: env.apiUrl,
    SUPABASE_ANON_KEY: env.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: env.serviceRoleKey,
    TAMURT_SERVER_SECRET: 'integration-tests-secret-0123456789abcdef',
    DEMO_PROVIDER_WEBHOOK_SECRET: 'whsec_integration_tests_only',
  });
  return createServerContext({
    env: serverEnv,
    logger: { info: () => undefined, warn: () => undefined, error: () => undefined },
    email: new SmtpEmailAdapter(
      { host: '127.0.0.1', port: 54325, secure: false, from: 'Tamurt Events <noreply@tamurt.test>' },
      { info: () => undefined, warn: () => undefined, error: () => undefined },
    ),
    ...(overrides.now ? { now: overrides.now } : {}),
  });
}

export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}-${randomUUID().slice(0, 8)}@tamurt.test`;
}

export const TEST_PASSWORD = 'TestPassw0rd!';

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  client: TamurtSupabaseClient;
  auth: AuthUser;
}

/** Crée un compte confirmé, ouvre une session réelle (jeton Auth) et attribue d'éventuels rôles. */
export async function createTestUser(
  options: { roles?: ('organizer' | 'moderator' | 'admin' | 'beta_tester')[]; displayName?: string; confirmed?: boolean } = {},
): Promise<TestUser> {
  const env = testEnv();
  const admin = adminClient();
  const email = uniqueEmail();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: options.confirmed ?? true,
    user_metadata: { display_name: options.displayName ?? 'Testeur', locale: 'fr' },
  });
  if (error || !data.user) throw error ?? new Error('createUser');
  const roles = options.roles ?? ['beta_tester'];
  if (roles.length) {
    const { error: roleError } = await admin.from('user_roles').insert(roles.map((role) => ({ user_id: data.user.id, role })));
    if (roleError) throw roleError;
  }
  const anon = anonClient();
  const { data: session, error: signInError } = await anon.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (signInError || !session.session) throw signInError ?? new Error('signIn');
  const accessToken = session.session.access_token;
  return {
    id: data.user.id,
    email,
    accessToken,
    client: createUserClient(env.apiUrl, env.anonKey, accessToken),
    auth: {
      id: data.user.id,
      email,
      emailVerified: true,
      displayName: options.displayName ?? 'Testeur',
      locale: 'fr',
      roles,
      suspended: false,
      accessToken,
    },
  };
}

export interface TicketedEvent {
  organizerId: string;
  eventId: string;
  eventSlug: string;
  offerId: string;
  externalOfferId: string;
}

/** Organisateur vérifié + événement publié avec billetterie de démonstration. */
export async function createTicketedEvent(
  owner: TestUser,
  options: { capacity?: number; faceValueMinor?: number; maxPerOrder?: number; resaleAllowed?: boolean; startsInDays?: number; country?: 'FR' | 'DZ' | 'US' | 'CA' } = {},
): Promise<TicketedEvent> {
  const admin = adminClient();
  const country = options.country ?? 'FR';
  const currency = { FR: 'EUR', DZ: 'DZD', US: 'USD', CA: 'CAD' }[country];
  const { data: city } = await admin.from('cities').select('id, timezone').eq('country_code', country).limit(1).single();
  if (!city) throw new Error('city');
  const suffix = randomUUID().slice(0, 8);
  const { data: organizer, error: orgError } = await admin
    .from('organizer_profiles')
    .insert({ name: `Organisateur test ${suffix}`, slug: `org-test-${suffix}`, kind: 'professional', country_code: country, created_by: owner.id, verification_status: 'verified', is_demo: true })
    .select('id')
    .single();
  if (orgError || !organizer) throw orgError;
  const startsAt = new Date(Date.now() + (options.startsInDays ?? 20) * 86_400_000);
  const { data: event, error: eventError } = await admin
    .from('events')
    .insert({
      organizer_id: organizer.id,
      slug: `evenement-test-${suffix}`,
      title: `Concert de test ${suffix}`,
      category_slug: 'concerts',
      status: 'published',
      country_code: country,
      city_id: city.id,
      timezone: city.timezone,
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 3 * 3_600_000).toISOString(),
      registration_mode: 'tickets',
      is_demo: true,
      created_by: owner.id,
    })
    .select('id, slug')
    .single();
  if (eventError || !event) throw eventError;
  const externalOfferId = `OF-${suffix}`;
  const store = new PostgresDemoInventoryStore(admin);
  await store.upsertInventory({
    offerRef: externalOfferId,
    eventRef: `EV-${suffix}`,
    label: 'Catégorie unique',
    currency,
    faceValueMinor: options.faceValueMinor ?? 3500,
    bookingFeeMinor: 150,
    capacity: options.capacity ?? 100,
    maxPerOrder: options.maxPerOrder ?? 6,
  });
  const { data: offer, error: offerError } = await admin
    .from('ticket_offers')
    .insert({
      event_id: event.id,
      provider_id: 'demo',
      external_offer_id: externalOfferId,
      environment: 'demo',
      name: 'Catégorie unique',
      currency,
      face_value_minor: options.faceValueMinor ?? 3500,
      provider_fee_minor: 150,
      max_per_order: options.maxPerOrder ?? 6,
      resale_allowed: options.resaleAllowed ?? true,
      available_estimate: options.capacity ?? 100,
    })
    .select('id')
    .single();
  if (offerError || !offer) throw offerError;
  return { organizerId: organizer.id, eventId: event.id, eventSlug: event.slug, offerId: offer.id, externalOfferId };
}

/** Recherche un e-mail reçu par Mailpit pour un destinataire. */
export async function findMail(to: string, attempts = 20): Promise<{ subject: string; text: string; html: string } | null> {
  const base = testEnv().mailpitUrl;
  for (let i = 0; i < attempts; i += 1) {
    const response = await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    if (response.ok) {
      const payload = (await response.json()) as { messages?: { ID: string; Subject: string }[] };
      const first = payload.messages?.[0];
      if (first) {
        const message = (await (await fetch(`${base}/api/v1/message/${first.ID}`)).json()) as { Subject: string; Text: string; HTML: string };
        return { subject: message.Subject, text: message.Text, html: message.HTML };
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

import { AppError, hasAppAccess, type BetaMode, type PlatformRole } from '@tamurt/core';
import { DemoPaymentProvider, PaymentRouter } from '@tamurt/payments';
import { ConnectorRegistry, DemoTicketProvider, parseLiveProviderList } from '@tamurt/ticketing';
import { PostgresDemoInventoryStore } from './demo-store';
import { createEmailAdapter, type EmailAdapter } from './email/adapter';
import { readServerEnv, type ServerEnv } from './env';
import { createPushAdapter, type PushAdapter } from './push/expo';
import { createAdminClient, createUserClient, type TamurtSupabaseClient } from './supabase';

export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

export const consoleLogger: Logger = {
  info: (message, meta) => console.info(JSON.stringify({ level: 'info', message, ...meta })),
  warn: (message, meta) => console.warn(JSON.stringify({ level: 'warn', message, ...meta })),
  error: (message, meta) => console.error(JSON.stringify({ level: 'error', message, ...meta })),
};

export interface ServerContext {
  env: ServerEnv;
  admin: TamurtSupabaseClient;
  registry: ConnectorRegistry;
  payments: PaymentRouter;
  email: EmailAdapter;
  push: PushAdapter;
  logger: Logger;
  now: () => Date;
  userClient: (accessToken: string) => TamurtSupabaseClient;
}

export interface CreateContextOptions {
  env?: ServerEnv;
  logger?: Logger;
  now?: () => Date;
  email?: EmailAdapter;
  push?: PushAdapter;
}

/** Construit le contexte serveur (un par processus ; sans état propre à une requête). */
export function createServerContext(options: CreateContextOptions = {}): ServerContext {
  const env = options.env ?? readServerEnv();
  const admin = createAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const logger = options.logger ?? consoleLogger;
  const demo = new DemoTicketProvider(new PostgresDemoInventoryStore(admin), {
    webhookSecret: env.DEMO_PROVIDER_WEBHOOK_SECRET ?? null,
  });
  return {
    env,
    admin,
    registry: new ConnectorRegistry({ demo, live: [], liveEnabledIds: parseLiveProviderList(env.TICKETING_LIVE_PROVIDERS) }),
    payments: new PaymentRouter({ demo: new DemoPaymentProvider(), live: null }),
    email: options.email ?? createEmailAdapter(env, logger),
    push: options.push ?? createPushAdapter(env, logger),
    logger,
    now: options.now ?? (() => new Date()),
    userClient: (accessToken) => createUserClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, accessToken),
  };
}

export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  locale: 'fr' | 'en' | 'ar';
  roles: PlatformRole[];
  suspended: boolean;
  accessToken: string;
}

/** Valide un jeton d'accès auprès de Supabase Auth puis charge le profil et les rôles. */
export async function authenticate(ctx: ServerContext, accessToken: string | null | undefined): Promise<AuthUser> {
  if (!accessToken) throw new AppError('unauthenticated');
  const { data, error } = await ctx.admin.auth.getUser(accessToken);
  if (error || !data.user) throw new AppError('unauthenticated');
  const user = data.user;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    ctx.admin.from('profiles').select('display_name, locale, is_suspended, deleted_at').eq('id', user.id).maybeSingle(),
    ctx.admin.from('user_roles').select('role').eq('user_id', user.id),
  ]);
  return {
    id: user.id,
    email: user.email ?? '',
    emailVerified: Boolean(user.email_confirmed_at),
    displayName: profile?.display_name ?? 'Membre Tamurt',
    locale: (profile?.locale as AuthUser['locale']) ?? 'fr',
    roles: (roles ?? []).map((r) => r.role as PlatformRole),
    suspended: Boolean(profile?.is_suspended || profile?.deleted_at),
    accessToken,
  };
}

export async function getBetaMode(ctx: ServerContext): Promise<BetaMode> {
  const { data } = await ctx.admin.from('app_settings').select('value').eq('key', 'beta').maybeSingle();
  const mode = (data?.value as { mode?: string } | null)?.mode;
  return mode === 'open' ? 'open' : 'closed';
}

/** Fonctionnalités interactives : compte actif + accès bêta (si bêta fermée). */
export async function requireAppAccess(ctx: ServerContext, user: AuthUser): Promise<void> {
  if (user.suspended) throw new AppError('account_suspended');
  const betaMode = await getBetaMode(ctx);
  if (!hasAppAccess({ authenticated: true, suspended: user.suspended, roles: user.roles, betaMode })) {
    throw new AppError('beta_access_required');
  }
}

export function requireStaff(user: AuthUser): void {
  if (user.suspended || !(user.roles.includes('admin') || user.roles.includes('moderator'))) {
    throw new AppError('forbidden');
  }
}

export function requireAdmin(user: AuthUser): void {
  if (user.suspended || !user.roles.includes('admin')) throw new AppError('forbidden');
}

import 'server-only';
import { AppError, toAppError } from '@tamurt/core';
import { getMessages, negotiateLocale, type Locale } from '@tamurt/i18n';
import { authenticate, type AuthUser, type ServerContext } from '@tamurt/server';
import { flattenIssues, idempotencyKeySchema } from '@tamurt/validation';
import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';
import { getServerContext } from './server-context';
import { createSupabaseServerClient } from './supabase/server';

/**
 * Outils communs des routes /api/v1 :
 *  - authentification par jeton Bearer (mobile) ou cookie de session (web, même origine) ;
 *  - validation Zod des corps de requête ;
 *  - clés d'idempotence ;
 *  - erreurs JSON { error: { code, message, details } } traduites selon Accept-Language.
 */
export interface ApiArgs<P> {
  request: NextRequest;
  params: P;
  ctx: ServerContext;
  locale: Locale;
}

const MAX_BODY_BYTES = 64 * 1024;

export function apiRoute<P = Record<string, string>>(handler: (args: ApiArgs<P>) => Promise<unknown>) {
  return async (request: NextRequest, context: { params: Promise<P> }): Promise<Response> => {
    const locale = negotiateLocale(request.headers.get('accept-language'));
    try {
      const params = ((await context?.params) ?? {}) as P;
      const result = await handler({ request, params, ctx: getServerContext(), locale });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (error) {
      return errorResponse(error, locale);
    }
  };
}

export function errorResponse(error: unknown, locale: Locale): NextResponse {
  const appError = toAppError(error);
  const internal = appError.code === 'internal_error';
  if (internal) console.error(JSON.stringify({ level: 'error', message: 'api_internal_error', error: (error as Error)?.message }));
  const messages = getMessages(locale).errors as Record<string, string>;
  const details = internal ? undefined : appError.details;
  const headers = new Headers({ 'cache-control': 'no-store' });
  const resetAt = typeof details?.reset_at === 'string' ? Date.parse(details.reset_at) : NaN;
  if (appError.code === 'rate_limited' && Number.isFinite(resetAt)) {
    headers.set('retry-after', String(Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))));
  }
  return NextResponse.json(
    { error: { code: appError.code, message: messages[appError.code] ?? messages.internal_error ?? appError.code, ...(details ? { details } : {}) } },
    { status: appError.status, headers },
  );
}

/** Protection CSRF des requêtes authentifiées par cookie : l'origine doit être le site lui-même. */
function assertSameOrigin(request: NextRequest): void {
  if (request.method === 'GET' || request.method === 'HEAD') return;
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (origin) {
    try {
      if (new URL(origin).host === host) return;
    } catch {
      // origine invalide : refus ci-dessous
    }
    throw new AppError('forbidden', 'cross_origin_request');
  }
  if (request.headers.get('sec-fetch-site') === 'same-origin') return;
  throw new AppError('forbidden', 'cross_origin_request');
}

async function accessTokenFrom(request: NextRequest): Promise<string | null> {
  const header = request.headers.get('authorization');
  if (header?.toLowerCase().startsWith('bearer ')) return header.slice(7).trim() || null;
  // Sans cookie de session : simplement non authentifié (401).
  if (!request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'))) return null;
  // Avec cookie de session : protection CSRF des requêtes de modification.
  assertSameOrigin(request);
  const supabase = await createSupabaseServerClient();
  // getSession lit (et rafraîchit si besoin) le jeton du cookie ; il est ensuite VÉRIFIÉ par authenticate (getUser).
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function requireUser({ request, ctx }: Pick<ApiArgs<unknown>, 'request' | 'ctx'>): Promise<AuthUser> {
  return authenticate(ctx, await accessTokenFrom(request));
}

export async function optionalUser(args: Pick<ApiArgs<unknown>, 'request' | 'ctx'>): Promise<AuthUser | null> {
  try {
    return await requireUser(args);
  } catch (error) {
    if (toAppError(error).code === 'unauthenticated') return null;
    throw error;
  }
}

export async function readJson<S extends z.ZodType>(request: NextRequest, schema: S): Promise<z.output<S>> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) throw new AppError('validation_failed', 'payload_too_large');
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new AppError('validation_failed', 'payload_too_large');
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new AppError('validation_failed', 'invalid_json');
    }
  }
  return parseWith(schema, body);
}

export function parseWith<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new AppError('validation_failed', undefined, { issues: flattenIssues(parsed.error) });
  return parsed.data;
}

export function requireIdempotencyKey(request: NextRequest): string {
  const value = request.headers.get('idempotency-key');
  if (!value) throw new AppError('idempotency_key_missing');
  const parsed = idempotencyKeySchema.safeParse(value);
  if (!parsed.success) throw new AppError('validation_failed', undefined, { issues: flattenIssues(parsed.error) });
  return parsed.data;
}

export function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

export function created<T>(body: T): NextResponse {
  return NextResponse.json(body, { status: 201 });
}

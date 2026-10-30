import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const repoRoot = resolve(import.meta.dirname, '../..');

/** Charge un fichier .env simple (KEY=value) sans écraser les variables déjà définies. */
export function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/.exec(line);
    if (match && !line.trim().startsWith('#') && process.env[match[1] as string] === undefined) {
      process.env[match[1] as string] = match[2];
    }
  }
}

/** Variables Supabase : environnement, puis apps/web/.env.local, puis `supabase status` (local). */
export function resolveSupabaseEnv(): { url: string; anonKey: string; serviceRoleKey: string; isLocal: boolean } {
  loadDotEnv(resolve(repoRoot, 'apps/web/.env.local'));
  let url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  let anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    const output = execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['supabase', 'status', '-o', 'env'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: process.platform === 'win32',
    });
    const values = Object.fromEntries(
      output
        .split('\n')
        .map((line) => /^([A-Z_]+)="?(.*?)"?$/.exec(line.trim()))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => [m[1] as string, m[2] as string]),
    );
    url = values.API_URL;
    anonKey = values.ANON_KEY;
    serviceRoleKey = values.SERVICE_ROLE_KEY;
  }
  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error('Configuration Supabase introuvable : lancez `pnpm db:start` ou définissez les variables.');
  }
  const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url);
  return { url, anonKey, serviceRoleKey, isLocal };
}

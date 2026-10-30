#!/usr/bin/env node
/**
 * Prépare l'environnement LOCAL (Windows, macOS, Linux) :
 *  - lit les URL et clés du Supabase local (`supabase status`) ;
 *  - génère des secrets aléatoires propres à votre machine ;
 *  - écrit apps/web/.env.local et apps/mobile/.env.local (fichiers ignorés par Git).
 *
 * Usage : pnpm setup:local            (complète les fichiers existants sans écraser vos valeurs)
 *         pnpm setup:local --force    (régénère toutes les valeurs gérées par ce script)
 *
 * Ce script ne contacte aucun service externe et n'écrit jamais de secret dans le dépôt.
 */
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const force = process.argv.includes('--force');
const isWindows = process.platform === 'win32';

function readSupabaseStatus() {
  try {
    const output = execFileSync(isWindows ? 'npx.cmd' : 'npx', ['supabase', 'status', '-o', 'json'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWindows,
    });
    const start = output.indexOf('{');
    return JSON.parse(output.slice(start));
  } catch {
    console.error('✖ Supabase local ne répond pas. Démarrez Docker puis lancez : pnpm db:start');
    process.exit(1);
  }
}

function parseEnvFile(path) {
  const values = new Map();
  if (!existsSync(path)) return values;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) values.set(match[1], match[2]);
  }
  return values;
}

function writeEnvFile(path, header, entries) {
  const existed = existsSync(path);
  const existing = parseEnvFile(path);
  const lines = [header, ''];
  const managed = new Set();
  for (const [key, value] of entries) {
    managed.add(key);
    const keep = !force && existing.has(key) && existing.get(key) !== '';
    lines.push(`${key}=${keep ? existing.get(key) : value}`);
  }
  // Conserve les variables ajoutées à la main.
  for (const [key, value] of existing) {
    if (!managed.has(key)) lines.push(`${key}=${value}`);
  }
  writeFileSync(path, `${lines.join('\n')}\n`, 'utf8');
  console.info(`✔ ${path.replace(root, '.')} ${existed ? 'mis à jour' : 'créé'}`);
}

const secret = (bytes = 32) => randomBytes(bytes).toString('base64url');
const status = readSupabaseStatus();
const apiUrl = status.API_URL ?? 'http://127.0.0.1:54321';
const anonKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
const serviceKey = status.SERVICE_ROLE_KEY ?? status.SECRET_KEY;
if (!anonKey || !serviceKey) {
  console.error('✖ Clés Supabase introuvables dans `supabase status`.');
  process.exit(1);
}

writeEnvFile(
  join(root, 'apps/web/.env.local'),
  '# Généré par `pnpm setup:local` pour le développement LOCAL uniquement. Ne jamais committer.',
  [
    ['NEXT_PUBLIC_APP_URL', 'http://localhost:3000'],
    ['NEXT_PUBLIC_SUPABASE_URL', apiUrl],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey],
    ['SUPABASE_SERVICE_ROLE_KEY', serviceKey],
    ['TAMURT_SERVER_SECRET', secret(48)],
    ['CRON_SECRET', secret(32)],
    ['DEMO_PROVIDER_WEBHOOK_SECRET', secret(32)],
    // Mailpit (inclus dans Supabase local) capture tous les e-mails : aucun envoi réel.
    ['SMTP_HOST', '127.0.0.1'],
    ['SMTP_PORT', '54325'],
    ['SMTP_SECURE', 'false'],
    ['EMAIL_FROM', '"Tamurt Events (local) <no-reply@tamurt.local>"'],
    ['NEXT_PUBLIC_MAP_STYLE_URL', 'https://tiles.openfreemap.org/styles/liberty'],
  ],
);

if (existsSync(join(root, 'apps/mobile/package.json'))) {
  writeEnvFile(
    join(root, 'apps/mobile/.env.local'),
    '# Généré par `pnpm setup:local`. Sur un téléphone physique, remplacez 127.0.0.1 par l’IP de votre ordinateur.',
    [
      ['EXPO_PUBLIC_SUPABASE_URL', apiUrl],
      ['EXPO_PUBLIC_SUPABASE_ANON_KEY', anonKey],
      ['EXPO_PUBLIC_API_URL', 'http://127.0.0.1:3000'],
      ['EXPO_PUBLIC_APP_ENV', 'development'],
    ],
  );
}

console.info('\nÉtapes suivantes : pnpm db:reset (données de démo) puis pnpm dev:web');

#!/usr/bin/env node
/** Diagnostic de l'environnement de développement (lecture seule). */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
let failures = 0;

function run(command, args) {
  try {
    return execFileSync(isWindows ? `${command}.cmd` : command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: isWindows,
    }).trim();
  } catch {
    try {
      return execFileSync(command, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return null;
    }
  }
}

function check(label, ok, hint) {
  console.info(`${ok ? '✔' : '✖'} ${label}${ok ? '' : `\n    → ${hint}`}`);
  if (!ok) failures += 1;
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
check(`Node.js ${process.versions.node}`, nodeMajor >= 22, 'Installez Node.js 22 LTS (voir .nvmrc).');
const pnpmVersion = run('pnpm', ['--version']);
check(`pnpm ${pnpmVersion ?? 'absent'}`, Boolean(pnpmVersion && Number(pnpmVersion.split('.')[0]) >= 10), 'corepack enable && corepack prepare pnpm@10 --activate');
const docker = run('docker', ['info', '--format', '{{.ServerVersion}}']);
check(`Docker ${docker ?? 'indisponible'}`, Boolean(docker), 'Démarrez Docker Desktop (requis pour Supabase local).');
const supabase = docker ? run('npx', ['supabase', 'status', '-o', 'json']) : null;
check('Supabase local démarré', Boolean(supabase && supabase.includes('API_URL')), 'pnpm db:start');
check('apps/web/.env.local présent', existsSync(join(root, 'apps/web/.env.local')), 'pnpm setup:local');
check('Dépendances installées', existsSync(join(root, 'node_modules/.pnpm')) || existsSync(join(root, 'node_modules/next')), 'pnpm install');

console.info(failures === 0 ? '\nTout est prêt.' : `\n${failures} point(s) à corriger.`);
process.exit(failures === 0 ? 0 : 1);

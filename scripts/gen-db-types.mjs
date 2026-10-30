#!/usr/bin/env node
// Génère les types TypeScript de la base locale (multi-plateforme : Windows, macOS, Linux).
// Prérequis : `pnpm db:start` (Supabase local démarré).
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(root, 'packages/types/src/database.generated.ts');
const isWindows = process.platform === 'win32';

const output = execFileSync(
  isWindows ? 'npx.cmd' : 'npx',
  ['supabase', 'gen', 'types', 'typescript', '--local', '--schema', 'public'],
  { cwd: root, encoding: 'utf8', shell: isWindows, maxBuffer: 32 * 1024 * 1024 },
);

const header = '// Fichier généré par `pnpm db:types` — ne pas modifier à la main.\n';
const config = (await prettier.resolveConfig(target)) ?? {};
const formatted = await prettier.format(header + output, { ...config, parser: 'typescript' });
writeFileSync(target, formatted);
console.info(`Types écrits dans ${target}.`);

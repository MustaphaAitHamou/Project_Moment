/**
 * Copie le worker MapLibre (module autonome) dans public/ pour qu'il soit servi depuis le même
 * domaine : compatible avec la CSP (worker-src 'self') sans URL blob ni CDN tiers.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('maplibre-gl/package.json'));
const target = join(here, '..', 'public', 'maplibre');
mkdirSync(target, { recursive: true });
copyFileSync(join(pkgDir, 'dist', 'maplibre-gl-worker.mjs'), join(target, 'maplibre-gl-worker.mjs'));
console.info('maplibre-gl-worker.mjs copié dans public/maplibre/');

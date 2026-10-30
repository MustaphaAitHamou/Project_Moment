// Génère generated/tokens.css à partir des tokens TypeScript (source unique).
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTokensCss } from '../src/css';
import { logoMarkSvg } from '../src/logo';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
writeFileSync(resolve(root, 'generated/tokens.css'), buildTokensCss());
writeFileSync(resolve(root, 'generated/logo-mark.svg'), logoMarkSvg() + '\n');
console.info('generated/tokens.css et generated/logo-mark.svg mis à jour.');

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildTokensCss,
  CATEGORY_VISUALS,
  contrastRatio,
  createPosterSpec,
  generatePosterSvg,
  hashString,
  posterDataUrl,
  themes,
} from '../src';

describe('design tokens', () => {
  it('le fichier CSS généré est à jour (source unique des tokens)', () => {
    const generated = readFileSync(resolve(__dirname, '../generated/tokens.css'), 'utf8');
    expect(generated).toBe(buildTokensCss());
  });

  it.each(['light', 'dark'] as const)('respecte un contraste AA pour le texte (%s)', (name) => {
    const t = themes[name];
    expect(contrastRatio(t.text, t.background)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio(t.textMuted, t.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(t.textOnPrimary, t.primary)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(t.demo, t.demoSoft)).toBeGreaterThanOrEqual(4.5);
  });

  it('définit une couleur pour chaque catégorie', () => {
    expect(Object.keys(CATEGORY_VISUALS)).toHaveLength(13);
  });
});

describe('affiches génératives', () => {
  it('sont déterministes pour une même graine', () => {
    const a = generatePosterSvg({ seed: 'evt-1', category: 'concerts' });
    const b = generatePosterSvg({ seed: 'evt-1', category: 'concerts' });
    const c = generatePosterSvg({ seed: 'evt-2', category: 'concerts' });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith('<svg')).toBe(true);
    expect(a).not.toMatch(/NaN|undefined/);
  });

  it('produisent une data URL valide et des formes variées', () => {
    expect(posterDataUrl({ seed: 'x', category: 'theatre' })).toMatch(/^data:image\/svg\+xml;utf8,/);
    const layouts = new Set(Array.from({ length: 40 }, (_, i) => createPosterSpec({ seed: `s${i}`, category: 'family' }).shapes[0]?.kind));
    expect(layouts.size).toBeGreaterThanOrEqual(3);
  });

  it('utilise un hachage stable', () => {
    expect(hashString('tamurt')).toBe(hashString('tamurt'));
    expect(hashString('a')).not.toBe(hashString('b'));
  });
});

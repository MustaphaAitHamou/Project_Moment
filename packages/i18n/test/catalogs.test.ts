import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTranslator } from 'use-intl';
import { ERROR_STATUS } from '@tamurt/core';
import { LOCALES, MESSAGES, LOCALE_INFO, negotiateLocale, localizedName } from '../src';

type Tree = { [key: string]: string | Tree };

function leafKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : leafKeys(value, `${prefix}${key}.`),
  );
}

const reference = leafKeys(MESSAGES.fr as unknown as Tree).filter((k) => !k.startsWith('_meta'));

describe('catalogues de traduction', () => {
  it.each(LOCALES)('le catalogue %s contient exactement les clés du catalogue source', (locale) => {
    const keys = leafKeys(MESSAGES[locale] as unknown as Tree).filter((k) => !k.startsWith('_meta'));
    expect(keys.filter((k) => !reference.includes(k))).toEqual([]);
    expect(reference.filter((k) => !keys.includes(k))).toEqual([]);
  });

  it('marque explicitement l’arabe comme brouillon non vérifié', () => {
    expect(LOCALE_INFO.ar.status).toBe('draft_unverified');
    expect(LOCALE_INFO.ar.direction).toBe('rtl');
    expect((MESSAGES.ar as unknown as { _meta: { status: string } })._meta.status).toBe('draft_unverified');
  });

  it('traduit tous les codes d’erreur métier', () => {
    for (const code of Object.keys(ERROR_STATUS)) {
      expect(reference).toContain(`errors.${code}`);
    }
  });

  it('traduit toutes les clés de validation utilisées par @tamurt/validation', () => {
    const dir = resolve(__dirname, '../../validation/src');
    const used = new Set<string>();
    for (const file of readdirSync(dir)) {
      const source = readFileSync(join(dir, file), 'utf8');
      for (const match of source.matchAll(/'validation\.([a-z_]+)'/g)) used.add(`validation.${match[1]}`);
    }
    expect(used.size).toBeGreaterThan(20);
    for (const key of used) expect(reference).toContain(key);
  });

  it.each(LOCALES)('compile chaque message ICU (%s)', (locale) => {
    const t = createTranslator({ locale, messages: MESSAGES[locale] as unknown as Record<string, unknown> });
    const params = {
      count: 3, price: '10 €', min: '1', max: '2', title: 'X', event_title: 'X', order_number: 'TD-1', email: 'a@b.c',
      date: '1/1', time: '05:00', code: 'C', amount: '1', label: 'L', number: 'N', alias: 'V-1', reason: 'R', note: 'N',
      age: 18, capacity: 10, radius: '5 km', timezone: 'Europe/Paris', value: 1, lead: '1 h', duration: '1 h', venue: 'V',
      used: 1, total: 2, start: 'a', end: 'b', event: 'E', version: '1.0', page: 2, holder: 'H',
    };
    for (const key of reference) {
      expect(() => t(key as never, params as never), `${locale}:${key}`).not.toThrow();
    }
  });

  it('négocie la langue à partir d’Accept-Language', () => {
    expect(negotiateLocale('ar-DZ,ar;q=0.9,fr;q=0.8')).toBe('ar');
    expect(negotiateLocale('de-DE,en;q=0.5')).toBe('en');
    expect(negotiateLocale('de-DE')).toBe('fr');
    expect(negotiateLocale(['en-CA', 'fr-CA'])).toBe('en');
  });

  it('choisit le nom localisé avec repli', () => {
    expect(localizedName({ fr: 'Algérie', en: 'Algeria', ar: 'الجزائر' }, 'ar')).toBe('الجزائر');
    expect(localizedName({ fr: 'Béjaïa' }, 'en')).toBe('Béjaïa');
  });
});

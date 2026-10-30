import type { CountryCode } from './countries';

/**
 * Normalisation E.164 pour les quatre marchés (règles volontairement simples ; une
 * bibliothèque complète pourra remplacer ce module si de nouveaux pays sont ouverts).
 */

const RULES: Record<CountryCode, { prefix: string; nationalLength: number; trunkPrefix: string | null; pattern: RegExp }> = {
  FR: { prefix: '33', nationalLength: 9, trunkPrefix: '0', pattern: /^[1-9]\d{8}$/ },
  DZ: { prefix: '213', nationalLength: 9, trunkPrefix: '0', pattern: /^[1-9]\d{8}$/ },
  US: { prefix: '1', nationalLength: 10, trunkPrefix: '1', pattern: /^[2-9]\d{2}[2-9]\d{6}$/ },
  CA: { prefix: '1', nationalLength: 10, trunkPrefix: '1', pattern: /^[2-9]\d{2}[2-9]\d{6}$/ },
};

/** Renvoie le numéro au format E.164 (+33612345678) ou null s'il est invalide. */
export function normalizePhone(input: string, defaultCountry: CountryCode): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('+') || digits.startsWith('00')) {
    const international = digits.startsWith('+') ? digits.slice(1) : digits.slice(2);
    for (const rule of Object.values(RULES)) {
      if (international.startsWith(rule.prefix)) {
        const national = international.slice(rule.prefix.length);
        if (national.length === rule.nationalLength && rule.pattern.test(national)) {
          return `+${rule.prefix}${national}`;
        }
      }
    }
    return null;
  }
  const rule = RULES[defaultCountry];
  let national = digits;
  if (rule.trunkPrefix && national.length === rule.nationalLength + rule.trunkPrefix.length && national.startsWith(rule.trunkPrefix)) {
    national = national.slice(rule.trunkPrefix.length);
  }
  if (national.length === rule.nationalLength && rule.pattern.test(national)) {
    return `+${rule.prefix}${national}`;
  }
  return null;
}

export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value);
}

/** Affichage lisible : +33 6 12 34 56 78, +213 5 55 12 34 56, +1 (514) 555-0123. */
export function formatPhone(e164: string): string {
  if (e164.startsWith('+1') && e164.length === 12) {
    const n = e164.slice(2);
    return `+1 (${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}`;
  }
  if (e164.startsWith('+33') && e164.length === 12) {
    const n = e164.slice(3);
    return `+33 ${n[0]} ${n.slice(1).match(/.{2}/g)?.join(' ') ?? ''}`.trim();
  }
  if (e164.startsWith('+213') && e164.length === 13) {
    const n = e164.slice(4);
    return `+213 ${n[0]} ${n.slice(1).match(/.{2}/g)?.join(' ') ?? ''}`.trim();
  }
  return e164;
}

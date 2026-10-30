/**
 * Montants monétaires en unités mineures ENTIÈRES (centimes) : aucun calcul en virgule flottante.
 * Les produits intermédiaires passent par BigInt pour éviter tout dépassement.
 */
export const CURRENCIES = {
  EUR: { code: 'EUR', exponent: 2, displayFractionDigits: 2 },
  USD: { code: 'USD', exponent: 2, displayFractionDigits: 2 },
  CAD: { code: 'CAD', exponent: 2, displayFractionDigits: 2 },
  // ISO 4217 : 2 décimales pour le dinar algérien (centimes rarement utilisés à l'affichage).
  DZD: { code: 'DZD', exponent: 2, displayFractionDigits: 0 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CURRENCIES, value);
}

export function assertMinor(amount: number, label = 'amount'): void {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`${label} doit être un entier sûr (unités mineures), reçu ${amount}`);
  }
}

export function assertNonNegativeMinor(amount: number, label = 'amount'): void {
  assertMinor(amount, label);
  if (amount < 0) {
    throw new RangeError(`${label} doit être positif ou nul, reçu ${amount}`);
  }
}

export function sumMinor(amounts: readonly number[]): number {
  let total = 0n;
  for (const amount of amounts) {
    assertMinor(amount);
    total += BigInt(amount);
  }
  return toSafeNumber(total);
}

export function multiplyMinor(amount: number, quantity: number): number {
  assertMinor(amount);
  assertMinor(quantity, 'quantity');
  return toSafeNumber(BigInt(amount) * BigInt(quantity));
}

/**
 * Applique un taux en points de base (1 bp = 0,01 %) avec arrondi « demi vers le haut »
 * pour les montants positifs. Identique à public.bps_of() en SQL.
 */
export function bpsOf(amount: number, bps: number): number {
  assertNonNegativeMinor(amount);
  assertMinor(bps, 'bps');
  if (bps < 0) {
    throw new RangeError('bps doit être positif ou nul');
  }
  return toSafeNumber((BigInt(amount) * BigInt(bps) + 5000n) / 10000n);
}

/** Taux en points de base, arrondi à l'inférieur (plafonds réglementaires). */
export function bpsOfFloor(amount: number, bps: number): number {
  assertNonNegativeMinor(amount);
  assertMinor(bps, 'bps');
  return toSafeNumber((BigInt(amount) * BigInt(bps)) / 10000n);
}

/** Taux en points de base, arrondi au supérieur (planchers). */
export function bpsOfCeil(amount: number, bps: number): number {
  assertNonNegativeMinor(amount);
  assertMinor(bps, 'bps');
  return toSafeNumber((BigInt(amount) * BigInt(bps) + 9999n) / 10000n);
}

/**
 * Répartit un montant entier selon des poids (méthode du plus fort reste) :
 * la somme des parts est toujours exactement égale au total.
 */
export function allocateMinor(total: number, weights: readonly number[]): number[] {
  assertNonNegativeMinor(total, 'total');
  if (weights.length === 0) {
    throw new RangeError('au moins un poids est requis');
  }
  weights.forEach((w) => assertNonNegativeMinor(w, 'weight'));
  const weightSum = weights.reduce((acc, w) => acc + BigInt(w), 0n);
  if (weightSum === 0n) {
    throw new RangeError('la somme des poids doit être strictement positive');
  }
  const bigTotal = BigInt(total);
  const shares = weights.map((w) => (bigTotal * BigInt(w)) / weightSum);
  const remainders = weights.map((w, index) => ({ index, remainder: (bigTotal * BigInt(w)) % weightSum }));
  let leftover = bigTotal - shares.reduce((acc, s) => acc + s, 0n);
  remainders.sort((a, b) => (a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1));
  for (const { index } of remainders) {
    if (leftover <= 0n) break;
    shares[index] = (shares[index] ?? 0n) + 1n;
    leftover -= 1n;
  }
  return shares.map(toSafeNumber);
}

/** "12,50" | "12.5" | "12" -> 1250 (EUR). Rejette les saisies ambiguës ou trop précises. */
export function parseMajorToMinor(input: string, currency: CurrencyCode): number {
  const { exponent } = CURRENCIES[currency];
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new RangeError(`montant invalide : "${input}"`);
  }
  const [whole = '0', fraction = ''] = normalized.split('.');
  if (fraction.length > exponent) {
    throw new RangeError(`trop de décimales pour ${currency} : "${input}"`);
  }
  const minor = BigInt(whole) * 10n ** BigInt(exponent) + BigInt(fraction.padEnd(exponent, '0') || '0');
  return toSafeNumber(minor);
}

export function minorToMajorString(amountMinor: number, currency: CurrencyCode): string {
  assertMinor(amountMinor);
  const { exponent } = CURRENCIES[currency];
  const negative = amountMinor < 0;
  const abs = BigInt(Math.abs(amountMinor));
  const divisor = 10n ** BigInt(exponent);
  const whole = abs / divisor;
  const fraction = (abs % divisor).toString().padStart(exponent, '0');
  return `${negative ? '-' : ''}${whole.toString()}${exponent > 0 ? `.${fraction}` : ''}`;
}

export interface FormatMoneyOptions {
  /** Force l'affichage des décimales même pour un montant rond. */
  forceFractionDigits?: boolean;
}

/** Formatage localisé (Intl). La division n'est utilisée QUE pour l'affichage. */
export function formatMoney(
  amountMinor: number,
  currency: CurrencyCode,
  locale: string,
  options: FormatMoneyOptions = {},
): string {
  assertMinor(amountMinor);
  const meta = CURRENCIES[currency];
  const divisor = 10 ** meta.exponent;
  const isWhole = amountMinor % divisor === 0;
  const digits = options.forceFractionDigits
    ? meta.exponent
    : isWhole && meta.displayFractionDigits === 0
      ? 0
      : meta.displayFractionDigits === 0
        ? meta.exponent
        : meta.displayFractionDigits;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amountMinor / divisor);
}

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new RangeError('dépassement de capacité monétaire');
  }
  return Number(value);
}

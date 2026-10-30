import { describe, expect, it } from 'vitest';
import {
  allocateMinor,
  bpsOf,
  bpsOfCeil,
  bpsOfFloor,
  formatMoney,
  minorToMajorString,
  multiplyMinor,
  parseMajorToMinor,
  sumMinor,
} from '../src/money';

describe('money — unités mineures entières', () => {
  it('additionne et multiplie sans erreur d’arrondi', () => {
    // 0.1 + 0.2 en flottant vaut 0.30000000000000004 ; en centimes : 10 + 20 = 30
    expect(sumMinor([10, 20])).toBe(30);
    expect(multiplyMinor(1999, 3)).toBe(5997);
  });

  it('refuse les montants non entiers', () => {
    expect(() => sumMinor([10.5])).toThrow(RangeError);
    expect(() => multiplyMinor(100, 1.5)).toThrow(RangeError);
  });

  it('applique les points de base avec arrondi demi vers le haut', () => {
    expect(bpsOf(1000, 1000)).toBe(100); // 10 %
    expect(bpsOf(999, 1000)).toBe(100); // 99,9 -> 100
    expect(bpsOf(994, 1000)).toBe(99); // 99,4 -> 99
    expect(bpsOf(995, 1000)).toBe(100); // 99,5 -> 100
    expect(bpsOf(0, 1000)).toBe(0);
  });

  it('distingue plancher et plafond pour les règles réglementaires', () => {
    expect(bpsOfFloor(999, 5000)).toBe(499);
    expect(bpsOfCeil(999, 5000)).toBe(500);
  });

  it('répartit un montant sans perdre de centime (plus fort reste)', () => {
    const parts = allocateMinor(1000, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
    expect(parts).toEqual([334, 333, 333]);
    expect(allocateMinor(10, [3, 7])).toEqual([3, 7]);
  });

  it('analyse une saisie utilisateur sans flottants', () => {
    expect(parseMajorToMinor('12,50', 'EUR')).toBe(1250);
    expect(parseMajorToMinor('12.5', 'USD')).toBe(1250);
    expect(parseMajorToMinor('1500', 'DZD')).toBe(150000);
    expect(() => parseMajorToMinor('12.555', 'EUR')).toThrow(RangeError);
    expect(() => parseMajorToMinor('abc', 'EUR')).toThrow(RangeError);
    expect(minorToMajorString(1250, 'EUR')).toBe('12.50');
    expect(minorToMajorString(-5, 'EUR')).toBe('-0.05');
  });

  it('formate selon la locale et la devise', () => {
    expect(formatMoney(2500, 'EUR', 'fr-FR').replace(/\s/g, ' ')).toBe('25,00 €');
    expect(formatMoney(2500, 'USD', 'en-US')).toBe('$25.00');
    // Symbole local du dinar algérien en français : « DA » ; montant rond sans décimales.
    expect(formatMoney(150000, 'DZD', 'fr-DZ').replace(/\s/g, ' ')).toBe('1 500 DA');
    expect(formatMoney(150050, 'DZD', 'fr-DZ').replace(/\s/g, ' ')).toMatch(/1 500,50/);
    expect(formatMoney(4599, 'CAD', 'fr-CA').replace(/\s/g, ' ')).toBe('45,99 $');
  });
});

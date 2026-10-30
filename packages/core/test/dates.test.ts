import { describe, expect, it } from 'vitest';
import {
  addDaysToKey,
  formatEventRange,
  getTimeZoneOffsetMinutes,
  isValidTimeZone,
  isoToLocalInput,
  localDayRange,
  localInputToIso,
  parseDateKey,
  toLocalDateKey,
  zonedLocalToUtc,
} from '../src/dates';

describe('fuseaux horaires', () => {
  it('valide les fuseaux IANA', () => {
    expect(isValidTimeZone('Europe/Paris')).toBe(true);
    expect(isValidTimeZone('Africa/Algiers')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });

  it('convertit une heure locale en UTC (heure normale et heure d’été)', () => {
    expect(zonedLocalToUtc({ year: 2026, month: 1, day: 15, hour: 20, minute: 30 }, 'Europe/Paris').toISOString()).toBe(
      '2026-01-15T19:30:00.000Z',
    );
    expect(zonedLocalToUtc({ year: 2026, month: 7, day: 15, hour: 20, minute: 30 }, 'Europe/Paris').toISOString()).toBe(
      '2026-07-15T18:30:00.000Z',
    );
    // Algérie : UTC+1 toute l'année
    expect(zonedLocalToUtc({ year: 2026, month: 7, day: 15, hour: 20, minute: 0 }, 'Africa/Algiers').toISOString()).toBe(
      '2026-07-15T19:00:00.000Z',
    );
    expect(zonedLocalToUtc({ year: 2026, month: 12, day: 31, hour: 23, minute: 0 }, 'America/Los_Angeles').toISOString()).toBe(
      '2027-01-01T07:00:00.000Z',
    );
  });

  it('gère l’heure inexistante du passage à l’heure d’été (décalage vers l’avant)', () => {
    // 29 mars 2026 : à Paris, 02:00 -> 03:00 ; 02:30 n'existe pas.
    const instant = zonedLocalToUtc({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }, 'Europe/Paris');
    expect(instant.toISOString()).toBe('2026-03-29T01:30:00.000Z'); // affiché 03:30 CEST
    expect(() =>
      zonedLocalToUtc({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }, 'Europe/Paris', 'reject'),
    ).toThrow(RangeError);
  });

  it('gère l’heure ambiguë du passage à l’heure d’hiver', () => {
    // 25 octobre 2026 : 02:30 existe deux fois à Paris.
    const earlier = zonedLocalToUtc({ year: 2026, month: 10, day: 25, hour: 2, minute: 30 }, 'Europe/Paris');
    const later = zonedLocalToUtc({ year: 2026, month: 10, day: 25, hour: 2, minute: 30 }, 'Europe/Paris', 'later');
    expect(earlier.toISOString()).toBe('2026-10-25T00:30:00.000Z');
    expect(later.toISOString()).toBe('2026-10-25T01:30:00.000Z');
    // New York : 1er novembre 2026, 01:30 ambiguë
    const ny = zonedLocalToUtc({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, 'America/New_York');
    expect(ny.toISOString()).toBe('2026-11-01T05:30:00.000Z');
  });

  it('calcule le décalage horaire', () => {
    expect(getTimeZoneOffsetMinutes(new Date('2026-07-01T12:00:00Z'), 'Europe/Paris')).toBe(120);
    expect(getTimeZoneOffsetMinutes(new Date('2026-01-01T12:00:00Z'), 'America/Toronto')).toBe(-300);
  });

  it('détermine le jour local d’un instant selon le fuseau de l’événement', () => {
    const instant = new Date('2026-11-14T23:30:00Z');
    expect(toLocalDateKey(instant, 'Europe/Paris')).toBe('2026-11-15');
    expect(toLocalDateKey(instant, 'America/Los_Angeles')).toBe('2026-11-14');
  });

  it('fait l’aller-retour formulaire local <-> ISO UTC', () => {
    const iso = localInputToIso('2026-11-20', '19:45', 'America/Toronto');
    expect(iso).toBe('2026-11-21T00:45:00.000Z');
    expect(isoToLocalInput(iso, 'America/Toronto')).toEqual({ date: '2026-11-20', time: '19:45' });
  });

  it('calcule la plage UTC d’un jour local, y compris les jours de 23 h', () => {
    const range = localDayRange('2026-03-29', 'Europe/Paris');
    expect(range.start.toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect(range.end.toISOString()).toBe('2026-03-29T22:00:00.000Z');
    expect((range.end.getTime() - range.start.getTime()) / 3_600_000).toBe(23);
  });

  it('manipule les clés de date sans fuseau', () => {
    expect(addDaysToKey('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToKey('2028-03-01', -1)).toBe('2028-02-29');
    expect(() => parseDateKey('2026-02-30')).toThrow(RangeError);
  });

  it('formate une plage horaire dans le fuseau de l’événement', () => {
    const text = formatEventRange('2026-11-14T19:30:00Z', '2026-11-14T22:00:00Z', 'Europe/Paris', 'fr-FR');
    expect(text).toContain('20:30');
    expect(text).toContain('23:00');
  });
});

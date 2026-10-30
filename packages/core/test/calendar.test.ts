import { describe, expect, it } from 'vitest';
import {
  getMonthGrid,
  getWeekKeys,
  getWeekdayLabels,
  groupByLocalDay,
  resolveDatePreset,
  resolveDatePresetKeys,
  resolveWeekend,
} from '../src/calendar';
import { COUNTRIES } from '../src/countries';

describe('calendrier', () => {
  it('construit une grille mensuelle de 6 semaines commençant le lundi (France)', () => {
    const grid = getMonthGrid(2026, 11, COUNTRIES.FR.week, '2026-11-14');
    expect(grid).toHaveLength(6);
    expect(grid[0]?.[0]?.key).toBe('2026-10-26'); // lundi
    const today = grid.flat().find((d) => d.isToday);
    expect(today?.key).toBe('2026-11-14');
    expect(today?.isWeekend).toBe(true);
    expect(grid.flat().filter((d) => d.inMonth)).toHaveLength(30);
  });

  it('respecte la semaine algérienne (samedi -> vendredi, week-end vendredi-samedi)', () => {
    const week = getWeekKeys('2026-11-18', COUNTRIES.DZ.week.firstDayOfWeek); // mercredi
    expect(week[0]).toBe('2026-11-14'); // samedi
    expect(week[6]).toBe('2026-11-20'); // vendredi
    expect(resolveWeekend('2026-11-18', COUNTRIES.DZ.week.weekendDays)).toEqual({
      firstKey: '2026-11-20',
      lastKey: '2026-11-21',
    });
  });

  it('résout « ce week-end » en France, y compris un dimanche', () => {
    expect(resolveWeekend('2026-11-18', COUNTRIES.FR.week.weekendDays)).toEqual({
      firstKey: '2026-11-21',
      lastKey: '2026-11-22',
    });
    expect(resolveWeekend('2026-11-22', COUNTRIES.FR.week.weekendDays)).toEqual({
      firstKey: '2026-11-22',
      lastKey: '2026-11-22',
    });
  });

  it('résout les périodes prédéfinies', () => {
    expect(resolveDatePresetKeys('tomorrow', '2026-12-31', COUNTRIES.US.week)).toEqual({
      firstKey: '2027-01-01',
      lastKey: '2027-01-01',
    });
    expect(resolveDatePresetKeys('this_month', '2026-02-10', COUNTRIES.US.week).lastKey).toBe('2026-02-28');
    expect(resolveDatePresetKeys('this_week', '2026-11-18', COUNTRIES.US.week).lastKey).toBe('2026-11-21');
  });

  it('convertit une période en instants UTC dans le fuseau de référence', () => {
    const now = new Date('2026-11-18T10:00:00Z');
    const today = resolveDatePreset('today', now, 'Europe/Paris', COUNTRIES.FR.week);
    expect(today.from.toISOString()).toBe(now.toISOString());
    expect(today.to.toISOString()).toBe('2026-11-18T23:00:00.000Z');
    const weekend = resolveDatePreset('weekend', now, 'America/New_York', COUNTRIES.US.week);
    expect(weekend.from.toISOString()).toBe('2026-11-21T05:00:00.000Z');
    expect(weekend.to.toISOString()).toBe('2026-11-23T05:00:00.000Z');
  });

  it('regroupe les occurrences par jour local de chaque événement', () => {
    const groups = groupByLocalDay([
      { id: 'paris', starts_at: '2026-11-14T23:30:00Z', timezone: 'Europe/Paris' },
      { id: 'la', starts_at: '2026-11-14T23:30:00Z', timezone: 'America/Los_Angeles' },
    ]);
    expect([...groups.keys()]).toEqual(['2026-11-14', '2026-11-15']);
    expect(groups.get('2026-11-15')?.[0]?.id).toBe('paris');
  });

  it('produit des en-têtes de jours localisés', () => {
    expect(getWeekdayLabels('fr-FR', 1)[0]?.toLowerCase()).toContain('lun');
    expect(getWeekdayLabels('en-US', 0)[0]).toBe('Sun');
  });
});

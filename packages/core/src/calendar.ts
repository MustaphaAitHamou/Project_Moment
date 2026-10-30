import {
  addDaysToKey,
  addMonthsToKey,
  localDaysRange,
  makeDateKey,
  parseDateKey,
  toLocalDateKey,
  weekdayOfKey,
} from './dates';

/**
 * Calendrier : grilles mois / semaine / jour et périodes prédéfinies (aujourd'hui, ce week-end…).
 * Les conventions locales sont paramétrées par pays : premier jour de la semaine et jours de week-end
 * (ex. Algérie : semaine commençant le samedi, week-end vendredi-samedi).
 */

export interface WeekConvention {
  /** 0 = dimanche … 6 = samedi */
  firstDayOfWeek: number;
  /** Jours de week-end, ex. [6, 0] (samedi, dimanche) ou [5, 6] (vendredi, samedi). */
  weekendDays: readonly number[];
}

export const DEFAULT_WEEK_CONVENTION: WeekConvention = { firstDayOfWeek: 1, weekendDays: [6, 0] };

export interface CalendarDay {
  key: string;
  day: number;
  weekday: number;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

export function startOfWeekKey(key: string, firstDayOfWeek: number): string {
  const weekday = weekdayOfKey(key);
  const diff = (weekday - firstDayOfWeek + 7) % 7;
  return addDaysToKey(key, -diff);
}

export function getWeekKeys(key: string, firstDayOfWeek: number): string[] {
  const start = startOfWeekKey(key, firstDayOfWeek);
  return Array.from({ length: 7 }, (_, i) => addDaysToKey(start, i));
}

/** Grille de 6 semaines couvrant le mois (format classique d'un calendrier mensuel). */
export function getMonthGrid(
  year: number,
  month: number,
  convention: WeekConvention = DEFAULT_WEEK_CONVENTION,
  todayKey?: string,
): CalendarDay[][] {
  const firstKey = makeDateKey(year, month, 1);
  const gridStart = startOfWeekKey(firstKey, convention.firstDayOfWeek);
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < 6; w += 1) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d += 1) {
      const key = addDaysToKey(gridStart, w * 7 + d);
      const parts = parseDateKey(key);
      const weekday = weekdayOfKey(key);
      week.push({
        key,
        day: parts.day,
        weekday,
        inMonth: parts.month === month && parts.year === year,
        isToday: key === todayKey,
        isWeekend: convention.weekendDays.includes(weekday),
      });
    }
    weeks.push(week);
  }
  return weeks;
}

export function getMonthBounds(year: number, month: number): { firstKey: string; lastKey: string } {
  const firstKey = makeDateKey(year, month, 1);
  const lastKey = addDaysToKey(addMonthsToKey(firstKey, 1), -1);
  return { firstKey, lastKey };
}

/** Ordre des jours affichés dans l'en-tête du calendrier. */
export function getWeekdayOrder(firstDayOfWeek: number): number[] {
  return Array.from({ length: 7 }, (_, i) => (firstDayOfWeek + i) % 7);
}

export function getWeekdayLabels(locale: string, firstDayOfWeek: number, format: 'narrow' | 'short' | 'long' = 'short'): string[] {
  // 2023-01-01 était un dimanche.
  const formatter = new Intl.DateTimeFormat(locale, { weekday: format, timeZone: 'UTC' });
  return getWeekdayOrder(firstDayOfWeek).map((weekday) => formatter.format(new Date(Date.UTC(2023, 0, 1 + weekday))));
}

export const DATE_PRESETS = ['today', 'tomorrow', 'weekend', 'this_week', 'next_7_days', 'this_month'] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export function isDatePreset(value: unknown): value is DatePreset {
  return typeof value === 'string' && (DATE_PRESETS as readonly string[]).includes(value);
}

export interface DateRangeKeys {
  firstKey: string;
  lastKey: string;
}

/** Résout une période prédéfinie en jours calendaires locaux (bornes incluses). */
export function resolveDatePresetKeys(preset: DatePreset, todayKey: string, convention: WeekConvention): DateRangeKeys {
  switch (preset) {
    case 'today':
      return { firstKey: todayKey, lastKey: todayKey };
    case 'tomorrow': {
      const tomorrow = addDaysToKey(todayKey, 1);
      return { firstKey: tomorrow, lastKey: tomorrow };
    }
    case 'weekend':
      return resolveWeekend(todayKey, convention.weekendDays);
    case 'this_week': {
      const week = getWeekKeys(todayKey, convention.firstDayOfWeek);
      return { firstKey: todayKey, lastKey: week[6] ?? todayKey };
    }
    case 'next_7_days':
      return { firstKey: todayKey, lastKey: addDaysToKey(todayKey, 6) };
    case 'this_month': {
      const { year, month } = parseDateKey(todayKey);
      return { firstKey: todayKey, lastKey: getMonthBounds(year, month).lastKey };
    }
    default: {
      const exhaustive: never = preset;
      throw new RangeError(`période inconnue : ${String(exhaustive)}`);
    }
  }
}

/**
 * Week-end courant (si aujourd'hui en fait partie) ou prochain week-end.
 * Les jours de week-end sont supposés consécutifs (ex. ven.-sam. ou sam.-dim.).
 */
export function resolveWeekend(todayKey: string, weekendDays: readonly number[]): DateRangeKeys {
  if (weekendDays.length === 0) {
    return { firstKey: todayKey, lastKey: todayKey };
  }
  const isWeekend = (key: string) => weekendDays.includes(weekdayOfKey(key));
  let first = todayKey;
  if (!isWeekend(first)) {
    for (let i = 1; i <= 7; i += 1) {
      const candidate = addDaysToKey(todayKey, i);
      if (isWeekend(candidate)) {
        first = candidate;
        break;
      }
    }
  }
  let last = first;
  while (isWeekend(addDaysToKey(last, 1)) && last !== addDaysToKey(first, 6)) {
    last = addDaysToKey(last, 1);
  }
  return { firstKey: first, lastKey: last };
}

/** Période prédéfinie en instants UTC pour un fuseau de référence. */
export function resolveDatePreset(
  preset: DatePreset,
  now: Date,
  timeZone: string,
  convention: WeekConvention,
): { from: Date; to: Date } {
  const todayKey = toLocalDateKey(now, timeZone);
  const { firstKey, lastKey } = resolveDatePresetKeys(preset, todayKey, convention);
  const range = localDaysRange(firstKey, lastKey, timeZone);
  // Si la période inclut aujourd'hui, on part de maintenant : les événements déjà terminés
  // ne sont plus « à venir » (les événements en cours restent visibles).
  const from = range.start < now ? now : range.start;
  return { from, to: range.end };
}

/** Regroupe des occurrences par jour LOCAL de chaque événement (son propre fuseau). */
export function groupByLocalDay<T extends { starts_at: string; timezone: string }>(items: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = toLocalDateKey(new Date(item.starts_at), item.timezone);
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return new Map([...groups.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

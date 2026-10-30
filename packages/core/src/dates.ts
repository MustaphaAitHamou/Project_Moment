/**
 * Gestion des dates et fuseaux horaires sans dépendance (Intl uniquement : Node, navigateurs, Hermes).
 *
 * Règle produit : chaque événement s'affiche dans SON fuseau horaire (IANA) ; les instants
 * sont stockés en UTC. Les « clés de date » (YYYY-MM-DD) représentent un jour calendaire local.
 */

export interface LocalDateTime {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second?: number;
}

export interface ZonedParts extends Required<LocalDateTime> {
  weekday: number; // 0 = dimanche ... 6 = samedi
}

export type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject';

const dtfCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = dtfCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    dtfCache.set(timeZone, formatter);
  }
  return formatter;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0));
    return true;
  } catch {
    return false;
  }
}

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? '0';
  const hour = Number(value('hour'));
  return {
    year: Number(value('year')),
    month: Number(value('month')),
    day: Number(value('day')),
    hour: hour === 24 ? 0 : hour,
    minute: Number(value('minute')),
    second: Number(value('second')),
    weekday: WEEKDAYS[value('weekday')] ?? 0,
  };
}

/** Décalage (minutes) du fuseau par rapport à UTC à un instant donné. Paris en été : +120. */
export function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const p = getZonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const truncated = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - truncated) / 60000);
}

function sameLocal(a: ZonedParts, b: LocalDateTime): boolean {
  return (
    a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute
  );
}

/**
 * Convertit une heure murale locale (ex. 20:30 à Paris) en instant UTC.
 * - heure inexistante (passage à l'heure d'été) : décalée vers l'avant (« compatible », comme Temporal) ;
 * - heure ambiguë (passage à l'heure d'hiver) : première occurrence (« compatible »/« earlier »).
 */
export function zonedLocalToUtc(
  local: LocalDateTime,
  timeZone: string,
  disambiguation: Disambiguation = 'compatible',
): Date {
  if (!isValidTimeZone(timeZone)) {
    throw new RangeError(`fuseau horaire invalide : ${timeZone}`);
  }
  const guess = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second ?? 0);
  const day = 86_400_000;
  const offsetBefore = getTimeZoneOffsetMinutes(new Date(guess - day), timeZone);
  const offsetAfter = getTimeZoneOffsetMinutes(new Date(guess + day), timeZone);
  const candidates = Array.from(new Set([offsetBefore, offsetAfter]))
    .map((offset) => guess - offset * 60_000)
    .filter((instant) => sameLocal(getZonedParts(new Date(instant), timeZone), local))
    .sort((a, b) => a - b);

  if (candidates.length === 1) {
    return new Date(candidates[0] as number);
  }
  if (candidates.length > 1) {
    if (disambiguation === 'reject') {
      throw new RangeError('heure locale ambiguë (changement d’heure)');
    }
    return new Date((disambiguation === 'later' ? candidates[candidates.length - 1] : candidates[0]) as number);
  }
  // Heure inexistante (saut de l'heure d'été)
  if (disambiguation === 'reject') {
    throw new RangeError('heure locale inexistante (changement d’heure)');
  }
  const forward = guess - offsetBefore * 60_000;
  const backward = guess - offsetAfter * 60_000;
  return new Date(disambiguation === 'earlier' ? Math.min(forward, backward) : Math.max(forward, backward));
}

export function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Jour calendaire local (YYYY-MM-DD) d'un instant dans un fuseau. */
export function toLocalDateKey(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/** Heure locale (HH:mm) d'un instant dans un fuseau. */
export function toLocalTime(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) {
    throw new RangeError(`clé de date invalide : ${key}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new RangeError(`date inexistante : ${key}`);
  }
  return { year, month, day };
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    parseDateKey(value);
    return true;
  } catch {
    return false;
  }
}

export function makeDateKey(year: number, month: number, day: number): string {
  const d = new Date(Date.UTC(year, month - 1, day));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

export function addDaysToKey(key: string, days: number): string {
  const { year, month, day } = parseDateKey(key);
  return makeDateKey(year, month, day + days);
}

export function addMonthsToKey(key: string, months: number): string {
  const { year, month } = parseDateKey(key);
  return makeDateKey(year, month + months, 1);
}

export function weekdayOfKey(key: string): number {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function compareDateKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Début (inclus) et fin (exclue) d'un jour local, en instants UTC. */
export function localDayRange(key: string, timeZone: string): { start: Date; end: Date } {
  const { year, month, day } = parseDateKey(key);
  const next = parseDateKey(addDaysToKey(key, 1));
  return {
    start: zonedLocalToUtc({ year, month, day, hour: 0, minute: 0 }, timeZone),
    end: zonedLocalToUtc({ ...next, hour: 0, minute: 0 }, timeZone),
  };
}

/** Plage [début du premier jour, début du jour suivant le dernier) en UTC. */
export function localDaysRange(firstKey: string, lastKey: string, timeZone: string): { start: Date; end: Date } {
  return { start: localDayRange(firstKey, timeZone).start, end: localDayRange(lastKey, timeZone).end };
}

/** Combine une date (YYYY-MM-DD) et une heure (HH:mm) locales d'un événement en ISO UTC. */
export function localInputToIso(dateKey: string, time: string, timeZone: string): string {
  const { year, month, day } = parseDateKey(dateKey);
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) {
    throw new RangeError(`heure invalide : ${time}`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new RangeError(`heure invalide : ${time}`);
  }
  return zonedLocalToUtc({ year, month, day, hour, minute }, timeZone).toISOString();
}

/** Décompose un instant ISO en champs de formulaire locaux (date + heure) pour un fuseau. */
export function isoToLocalInput(iso: string, timeZone: string): { date: string; time: string } {
  const date = new Date(iso);
  return { date: toLocalDateKey(date, timeZone), time: toLocalTime(date, timeZone) };
}

export function getTimeZoneShortName(date: Date, timeZone: string, locale: string): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'short' }).formatToParts(date);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

export interface FormatEventDateOptions {
  /** Ajoute l'abréviation du fuseau (utile quand l'utilisateur consulte un autre pays). */
  withTimeZoneName?: boolean;
  weekday?: 'short' | 'long';
  month?: 'short' | 'long';
}

export function formatEventDateTime(
  iso: string,
  timeZone: string,
  locale: string,
  options: FormatEventDateOptions = {},
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: options.weekday ?? 'short',
    day: 'numeric',
    month: options.month ?? 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(options.withTimeZoneName ? { timeZoneName: 'short' } : {}),
  }).format(new Date(iso));
}

export function formatEventDay(iso: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatEventTime(iso: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
}

/** "sam. 14 nov. 2026, 20:30 – 23:00" ou plage multi-jours. */
export function formatEventRange(
  startIso: string,
  endIso: string | null | undefined,
  timeZone: string,
  locale: string,
  options: FormatEventDateOptions = {},
): string {
  const start = formatEventDateTime(startIso, timeZone, locale, options);
  if (!endIso) return start;
  const sameDay = toLocalDateKey(new Date(startIso), timeZone) === toLocalDateKey(new Date(endIso), timeZone);
  if (sameDay) {
    return `${start} – ${formatEventTime(endIso, timeZone, locale)}`;
  }
  return `${start} – ${formatEventDateTime(endIso, timeZone, locale, { ...options, withTimeZoneName: false })}`;
}

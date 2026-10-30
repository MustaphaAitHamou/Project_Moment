/**
 * Export vers les agendas externes par des mécanismes publics et autorisés :
 *  - fichier iCalendar (RFC 5545) : Apple Calendar, Outlook, Thunderbird, etc. ;
 *  - lien « modèle d'événement » Google Agenda ;
 *  - lien de composition Outlook.com.
 * Aucune API privée ni aucun accès au compte de l'utilisateur n'est utilisé.
 */

export interface CalendarEventInput {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  start: Date;
  end?: Date | null;
  status?: 'CONFIRMED' | 'CANCELLED' | 'TENTATIVE';
  sequence?: number;
  organizerName?: string | null;
  now?: Date;
}

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

export function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Plie une ligne à 75 octets UTF-8 maximum (RFC 5545 §3.1) sans couper un caractère. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;
  let limit = 75;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    if (currentBytes + bytes > limit) {
      chunks.push(current);
      current = char;
      currentBytes = bytes;
      limit = 74; // les lignes de continuation commencent par un espace
    } else {
      current += char;
      currentBytes += bytes;
    }
  }
  if (current) chunks.push(current);
  return chunks.join('\r\n ');
}

export function buildIcsEvent(input: CalendarEventInput): string {
  const end = input.end ?? new Date(input.start.getTime() + DEFAULT_DURATION_MS);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tamurt Services LLC//Tamurt Events//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${input.uid}`,
    `DTSTAMP:${toIcsUtc(input.now ?? new Date())}`,
    `DTSTART:${toIcsUtc(input.start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    ...(input.description ? [`DESCRIPTION:${escapeIcsText(input.description)}`] : []),
    ...(input.location ? [`LOCATION:${escapeIcsText(input.location)}`] : []),
    ...(input.url ? [`URL:${input.url}`] : []),
    ...(input.organizerName ? [`ORGANIZER;CN=${escapeIcsText(input.organizerName)}:noreply@tamurt.events`] : []),
    `STATUS:${input.status ?? 'CONFIRMED'}`,
    `SEQUENCE:${input.sequence ?? 0}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(input.title)}`,
    'TRIGGER:-PT2H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}

export function buildGoogleCalendarUrl(input: CalendarEventInput): string {
  const end = input.end ?? new Date(input.start.getTime() + DEFAULT_DURATION_MS);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${toIcsUtc(input.start)}/${toIcsUtc(end)}`,
  });
  const details = [input.description, input.url].filter(Boolean).join('\n\n');
  if (details) params.set('details', details);
  if (input.location) params.set('location', input.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(input: CalendarEventInput): string {
  const end = input.end ?? new Date(input.start.getTime() + DEFAULT_DURATION_MS);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: input.title,
    startdt: input.start.toISOString(),
    enddt: end.toISOString(),
  });
  const body = [input.description, input.url].filter(Boolean).join('\n\n');
  if (body) params.set('body', body);
  if (input.location) params.set('location', input.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

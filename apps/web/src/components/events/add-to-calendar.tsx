import { buildGoogleCalendarUrl, buildOutlookCalendarUrl, type CalendarEventInput } from '@tamurt/core';
import { CalendarPlus, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Ajout au calendrier : Google, Outlook (liens) et fichier .ics (Apple Calendar et autres). */
export function AddToCalendar({ slug, locale, event }: { slug: string; locale: string; event: CalendarEventInput }) {
  const t = useTranslations('agenda');
  const item = 'flex items-center gap-2 px-3.5 py-2 text-sm hover:bg-sunken';
  return (
    <details className="relative">
      <summary className="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold hover:bg-sunken [&::-webkit-details-marker]:hidden">
        <CalendarPlus className="h-5 w-5" aria-hidden />
        {t('addToCalendar')}
      </summary>
      <div className="absolute start-0 z-30 mt-2 w-60 overflow-hidden rounded-lg border border-line bg-raised py-1 shadow-lg">
        <a className={item} href={buildGoogleCalendarUrl(event)} target="_blank" rel="noopener noreferrer">{t('googleCalendar')}</a>
        <a className={item} href={buildOutlookCalendarUrl(event)} target="_blank" rel="noopener noreferrer">{t('outlookCalendar')}</a>
        <a className={item} href={`/api/v1/calendar/${slug}?locale=${locale}`} download>
          <Download className="h-4 w-4" aria-hidden />
          {t('appleCalendar')} / {t('downloadIcs')}
        </a>
      </div>
    </details>
  );
}

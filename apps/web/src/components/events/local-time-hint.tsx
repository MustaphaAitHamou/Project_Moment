'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

/** Si le visiteur n'est pas dans le fuseau de l'événement, affiche aussi l'heure chez lui. */
export function LocalTimeHint({ startsAt, eventTimeZone }: { startsAt: string; eventTimeZone: string }) {
  const t = useTranslations('dates');
  const locale = useLocale();
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    const visitorZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!visitorZone || visitorZone === eventTimeZone) return;
    const date = new Date(startsAt);
    const same = (zone: string) => new Intl.DateTimeFormat('en', { timeZone: zone, hour: 'numeric', minute: 'numeric', day: 'numeric' }).format(date);
    if (same(visitorZone) === same(eventTimeZone)) return;
    const formatted = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(date);
    setLabel(`${t('localTime', { timezone: visitorZone })} : ${formatted}`);
  }, [eventTimeZone, locale, startsAt, t]);
  return label ? <p className="text-xs text-subtle">{label}</p> : null;
}

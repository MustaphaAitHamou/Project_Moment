'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;
const visitorZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || null;
const serverZone = () => null;

/** Si le visiteur n'est pas dans le fuseau de l'événement, affiche aussi l'heure chez lui. */
export function LocalTimeHint({ startsAt, eventTimeZone }: { startsAt: string; eventTimeZone: string }) {
  const t = useTranslations('dates');
  const locale = useLocale();
  // Fuseau du navigateur : connu uniquement côté client (null au rendu serveur, sans écart d'hydratation).
  const zone = useSyncExternalStore(subscribe, visitorZone, serverZone);
  if (!zone || zone === eventTimeZone) return null;
  const date = new Date(startsAt);
  const same = (timeZone: string) => new Intl.DateTimeFormat('en', { timeZone, hour: 'numeric', minute: 'numeric', day: 'numeric' }).format(date);
  if (same(zone) === same(eventTimeZone)) return null;
  const formatted = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(date);
  return <p className="text-xs text-subtle">{`${t('localTime', { timezone: zone })} : ${formatted}`}</p>;
}

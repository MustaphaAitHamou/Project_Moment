'use client';
import { LocateFixed } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * « Autour de moi » : la position n'est demandée qu'après un clic explicite, utilisée pour la
 * recherche puis oubliée (seulement arrondie dans l'URL, jamais enregistrée côté serveur).
 */
export function NearMeButton({ query }: { query: Record<string, string> }) {
  const t = useTranslations('search');
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<'idle' | 'locating' | 'denied' | 'unavailable'>('idle');

  function locate() {
    if (!('geolocation' in navigator)) return setState('unavailable');
    setState('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { ...query, lat: position.coords.latitude.toFixed(2), lng: position.coords.longitude.toFixed(2), radius: query.radius ?? '25', sort: 'distance' };
        delete (next as Record<string, string>).page;
        delete (next as Record<string, string>).city;
        router.push({ pathname, query: next });
        setState('idle');
      },
      (error) => setState(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, maximumAge: 600_000, timeout: 10_000 },
    );
  }

  return (
    <div className="space-y-1.5">
      <button type="button" onClick={locate} disabled={state === 'locating'} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-semibold hover:bg-sunken disabled:opacity-60">
        <LocateFixed className="h-4 w-4" aria-hidden />
        {state === 'locating' ? t('locating') : t('aroundMe')}
      </button>
      <p className="text-xs text-subtle" role="status">
        {state === 'denied' ? t('locationDenied') : state === 'unavailable' ? t('locationUnavailable') : t('locationConsent')}
      </p>
    </div>
  );
}

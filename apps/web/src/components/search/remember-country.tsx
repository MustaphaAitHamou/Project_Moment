'use client';
import { useEffect } from 'react';

/** Mémorise le pays de navigation choisi (cookie fonctionnel, sans suivi). */
export function RememberCountry({ country }: { country: string | null }) {
  useEffect(() => {
    document.cookie = `TAMURT_COUNTRY=${country ?? 'all'}; path=/; max-age=31536000; samesite=lax`;
  }, [country]);
  return null;
}

'use client';
import { createTamurtApi } from '@tamurt/api-client';
import { useLocale } from 'next-intl';
import { useMemo } from 'react';

/** Client REST /api/v1 (session par cookie, même origine ; erreurs traduites dans la langue de l'interface). */
export function useApi() {
  const locale = useLocale();
  return useMemo(() => createTamurtApi({ baseUrl: '', locale }), [locale]);
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message && !/^[a-z_]+$/.test(error.message) ? error.message : fallback;
}

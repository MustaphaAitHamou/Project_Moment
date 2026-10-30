'use client';
import { useEffect } from 'react';
import { useApi } from '@/hooks/use-api';

/** Compte une vue (agrégée, dédoublonnée côté serveur, sans donnée personnelle conservée). */
export function ViewTracker({ eventId }: { eventId: string }) {
  const api = useApi();
  useEffect(() => {
    const timer = setTimeout(() => void api.events.track(eventId, 'view').catch(() => undefined), 1500);
    return () => clearTimeout(timer);
  }, [api, eventId]);
  return null;
}

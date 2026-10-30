import { getEventBySlug, getPublicSettings, isFavorite, listFavorites, listMyTickets, listNotifications, searchEvents, setFavorite } from '@tamurt/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { offlineEligible, readCache, saveCache } from './offline';
import { supabase } from './supabase';

export function useSearch(args: Parameters<typeof searchEvents>[1], enabled = true) {
  return useQuery({ queryKey: ['search', args], queryFn: () => searchEvents(supabase, args), enabled });
}

export function useEvent(slug: string) {
  return useQuery({ queryKey: ['event', slug], queryFn: () => getEventBySlug(supabase, slug) });
}

export function usePublicSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: () => getPublicSettings(supabase), staleTime: 300_000 });
}

export function useFavorites(enabled: boolean) {
  return useQuery({ queryKey: ['favorites'], queryFn: () => listFavorites(supabase), enabled });
}

export function useIsFavorite(userId: string | undefined, eventId: string | undefined) {
  return useQuery({ queryKey: ['favorite', eventId], queryFn: () => isFavorite(supabase, userId!, eventId!), enabled: Boolean(userId && eventId) });
}

export function useToggleFavorite(userId: string | undefined, eventId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (favorite: boolean) => setFavorite(supabase, userId!, eventId, favorite),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['favorite', eventId] });
      void client.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}

/**
 * Billets : réseau d'abord, puis repli sur la dernière copie locale des billets autorisés
 * hors ligne (aucun code d'accès n'est stocké pour les billets de démonstration).
 */
export function useMyTickets(enabled: boolean) {
  return useQuery({
    queryKey: ['tickets'],
    enabled,
    queryFn: async () => {
      try {
        const tickets = await listMyTickets(supabase);
        await saveCache('tickets', offlineEligible(tickets));
        return { tickets, offline: false as const, savedAt: null };
      } catch (error) {
        const cached = await readCache<Awaited<ReturnType<typeof listMyTickets>>>('tickets');
        if (cached) return { tickets: cached.data, offline: true as const, savedAt: cached.savedAt };
        throw error;
      }
    },
  });
}

export function useNotifications(enabled: boolean) {
  return useQuery({ queryKey: ['notifications'], queryFn: () => listNotifications(supabase, 100), enabled });
}

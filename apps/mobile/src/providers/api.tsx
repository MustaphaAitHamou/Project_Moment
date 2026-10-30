import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useLocale } from 'use-intl';
import { createApi, type MobileApi } from '@/lib/api';

const ApiContext = createContext<MobileApi | null>(null);

/** Cache des requêtes (React Query) + client REST dans la langue de l'interface. */
export function ApiProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }));
  const api = useMemo(() => createApi(locale), [locale]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => subscription.remove();
  }, []);
  return (
    <QueryClientProvider client={client}>
      <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
    </QueryClientProvider>
  );
}

export function useApi(): MobileApi {
  const context = useContext(ApiContext);
  if (!context) throw new Error('useApi doit être utilisé dans ApiProvider');
  return context;
}

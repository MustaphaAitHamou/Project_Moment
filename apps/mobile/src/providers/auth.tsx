import { getPublicSettings } from '@tamurt/api-client';
import { hasAppAccess, isStaff, type PlatformRole } from '@tamurt/core';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

export interface MobileViewer {
  id: string;
  email: string;
  displayName: string;
  roles: PlatformRole[];
  suspended: boolean;
  isStaff: boolean;
  hasAppAccess: boolean;
}

interface AuthState {
  ready: boolean;
  session: Session | null;
  viewer: MobileViewer | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadViewer(session: Session | null): Promise<MobileViewer | null> {
  if (!session) return null;
  const userId = session.user.id;
  const [profile, roles, settings] = await Promise.all([
    supabase.from('profiles').select('display_name, is_suspended, deleted_at').eq('id', userId).maybeSingle(),
    supabase.from('user_roles').select('role').eq('user_id', userId),
    getPublicSettings(supabase).catch(() => ({}) as Awaited<ReturnType<typeof getPublicSettings>>),
  ]);
  const roleList = (roles.data ?? []).map((row) => row.role as PlatformRole);
  const suspended = Boolean(profile.data?.is_suspended || profile.data?.deleted_at);
  return {
    id: userId,
    email: session.user.email ?? '',
    displayName: profile.data?.display_name ?? session.user.email?.split('@')[0] ?? '',
    roles: roleList,
    suspended,
    isStaff: !suspended && isStaff(roleList),
    hasAppAccess: hasAppAccess({ authenticated: true, suspended, roles: roleList, betaMode: settings.beta?.mode === 'open' ? 'open' : 'closed' }),
  };
}

/** Session Supabase + profil et rôles de l'utilisateur (les droits sont revérifiés par l'API et la RLS). */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [viewer, setViewer] = useState<MobileViewer | null>(null);

  const apply = useCallback(async (next: Session | null) => {
    setSession(next);
    setViewer(await loadViewer(next).catch(() => null));
    setReady(true);
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      void apply(next);
    });
    return () => data.subscription.unsubscribe();
  }, [apply]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      viewer,
      refresh: async () => apply((await supabase.auth.getSession()).data.session),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [apply, ready, session, viewer],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return context;
}

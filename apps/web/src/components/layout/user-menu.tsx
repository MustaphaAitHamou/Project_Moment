'use client';
import { LayoutDashboard, LogOut, Receipt, Repeat2, Settings, ShieldCheck, Sparkles, Ticket, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function UserMenu({ displayName, email, isStaff, isBetaTester }: { displayName: string; email: string; isStaff: boolean; isBetaTester: boolean }) {
  const t = useTranslations('nav');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const initials = displayName.trim().slice(0, 1).toUpperCase() || '?';

  async function logout() {
    setBusy(true);
    await getSupabaseBrowserClient().auth.signOut();
    router.replace('/');
    router.refresh();
  }

  const item = 'flex items-center gap-2.5 px-3.5 py-2 text-sm hover:bg-sunken';
  return (
    <details className="group relative">
      <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-full bg-secondary text-sm font-bold text-white [&::-webkit-details-marker]:hidden" aria-label={t('account')}>
        {initials}
      </summary>
      <div className="absolute end-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-line bg-raised py-1 shadow-lg">
        <div className="border-b border-line px-3.5 py-2.5">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p className="truncate text-xs text-muted">{email}</p>
        </div>
        <Link href="/account" className={item}><User className="h-4 w-4" aria-hidden />{t('account')}</Link>
        <Link href="/account/tickets" className={item}><Ticket className="h-4 w-4" aria-hidden />{t('tickets')}</Link>
        <Link href="/account/orders" className={item}><Receipt className="h-4 w-4" aria-hidden />{t('orders')}</Link>
        <Link href="/account/resale" className={item}><Repeat2 className="h-4 w-4" aria-hidden />{t('resale')}</Link>
        <Link href="/organizer" className={item}><LayoutDashboard className="h-4 w-4" aria-hidden />{t('organizer')}</Link>
        {isBetaTester ? <Link href="/account/beta" className={item}><Sparkles className="h-4 w-4" aria-hidden />{t('beta')}</Link> : null}
        {isStaff ? <Link href="/admin" className={item}><ShieldCheck className="h-4 w-4" aria-hidden />{t('admin')}</Link> : null}
        <Link href="/account/settings" className={item}><Settings className="h-4 w-4" aria-hidden />{t('settings')}</Link>
        <button type="button" onClick={logout} disabled={busy} className={`${item} w-full border-t border-line text-start text-danger`}>
          <LogOut className="h-4 w-4" aria-hidden />
          {t('logout')}
        </button>
      </div>
    </details>
  );
}

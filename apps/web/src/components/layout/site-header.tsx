import { countUnreadNotifications } from '@tamurt/api-client';
import { Bell, Plus, Search } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getSupabase, type Viewer } from '@/lib/session';
import { LocaleSwitcher } from './locale-switcher';
import { Logo } from './logo';
import { ThemeToggle, type ThemePreference } from './theme-toggle';
import { UserMenu } from './user-menu';

export async function SiteHeader({ viewer, theme }: { viewer: Viewer | null; theme: ThemePreference }) {
  const t = await getTranslations();
  let unread = 0;
  if (viewer) {
    try {
      unread = await countUnreadNotifications(await getSupabase());
    } catch {
      unread = 0;
    }
  }
  const navLink = 'rounded-full px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-sunken hover:text-fg';
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/75">
      <div className="container-page flex h-16 items-center gap-2">
        <Link href="/" className="me-2 shrink-0 rounded-md" aria-label={t('app.name')}>
          <Logo label={t('app.name')} />
        </Link>
        <nav aria-label={t('nav.discover')} className="hidden items-center gap-0.5 lg:flex">
          <Link href="/search" className={navLink}>{t('nav.discover')}</Link>
          <Link href="/agenda" className={navLink}>{t('nav.agenda')}</Link>
          <Link href="/map" className={navLink}>{t('nav.map')}</Link>
          <Link href="/resale" className={navLink}>{t('nav.resale')}</Link>
          <Link href="/beta" className={navLink}>{t('nav.beta')}</Link>
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <Link href="/search" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-sunken hover:text-fg" aria-label={t('nav.search')}>
            <Search className="h-5 w-5" aria-hidden />
          </Link>
          <Link href="/organizer/events/new" className={buttonClasses({ size: 'sm', className: 'hidden md:inline-flex' })}>
            <Plus className="h-4 w-4" aria-hidden />
            {t('nav.create')}
          </Link>
          <Suspense fallback={<span className="h-10 w-10" />}>
            <LocaleSwitcher />
          </Suspense>
          <ThemeToggle initial={theme} />
          {viewer ? (
            <>
              <Link href="/account/notifications" className="relative grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-sunken hover:text-fg" aria-label={`${t('nav.notifications')}${unread ? ` (${unread})` : ''}`}>
                <Bell className="h-5 w-5" aria-hidden />
                {unread > 0 ? <span className="absolute end-1.5 top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-4 text-on-primary">{unread > 9 ? '9+' : unread}</span> : null}
              </Link>
              <UserMenu displayName={viewer.displayName} email={viewer.email} isStaff={viewer.isStaff} isBetaTester={viewer.roles.includes('beta_tester') || viewer.isStaff} />
            </>
          ) : (
            <Link href="/auth/login" className={buttonClasses({ variant: 'outline', size: 'sm' })}>
              {t('nav.login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

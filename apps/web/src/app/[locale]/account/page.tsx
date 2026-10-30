import { listFollowedCities } from '@tamurt/api-client';
import { CalendarDays, Heart, Receipt, Ticket } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FollowCityButton } from '@/components/account/follow-city-button';
import { InterestsEditor } from '@/components/account/interests-editor';
import { Badge } from '@/components/ui/badge';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { nameOf } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

export default async function AccountPage({ params }: PageProps<'/[locale]/account'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, '/account');
  const t = await getTranslations();
  const supabase = await getSupabase();
  const [tickets, favorites, orders, cities, interests] = await Promise.all([
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'issued'),
    supabase.from('favorites').select('event_id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    listFollowedCities(supabase).catch(() => []),
    supabase.from('user_category_interests').select('category_slug').eq('user_id', viewer.id),
  ]);
  const tiles = [
    { href: '/account/tickets', label: t('nav.tickets'), value: tickets.count ?? 0, icon: Ticket },
    { href: '/account/favorites', label: t('nav.favorites'), value: favorites.count ?? 0, icon: Heart },
    { href: '/account/orders', label: t('nav.orders'), value: orders.count ?? 0, icon: Receipt },
    { href: '/account/agenda', label: t('nav.myAgenda'), value: '→', icon: CalendarDays },
  ];
  return (
    <>
      <PageHeader
        title={viewer.displayName}
        subtitle={viewer.email}
        actions={<Link href="/account/settings" className={buttonClasses({ variant: 'outline' })}>{t('nav.settings')}</Link>}
      />
      {viewer.roles.length ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">{t('account.roles')} :</span>
          {viewer.roles.map((role) => <Badge key={role} tone={role === 'admin' ? 'danger' : role === 'beta_tester' ? 'accent' : 'secondary'}>{role}</Badge>)}
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className="rounded-xl border border-line bg-surface p-4 transition-colors hover:bg-sunken">
            <tile.icon className="h-5 w-5 text-primary" aria-hidden />
            <p className="mt-3 font-display text-2xl font-bold tabular-nums">{tile.value}</p>
            <p className="text-sm text-muted">{tile.label}</p>
          </Link>
        ))}
      </div>
      <Card>
        <SectionHeader title={t('account.followedCities')} />
        <p className="mb-4 text-sm text-muted">{t('account.followedCitiesHelp')}</p>
        {cities.length ? (
          <ul className="flex flex-wrap gap-3">
            {cities.map(({ city }) => (
              <li key={city.id} className="flex items-center gap-2 rounded-full border border-line py-1 pe-1 ps-4 text-sm">
                <Link href={`/countries/${city.country_code.toLowerCase()}/${city.slug}`} className="font-semibold hover:underline">{nameOf(city.names, locale)}</Link>
                <FollowCityButton cityId={city.id} initial signedIn returnTo="/account" />
              </li>
            ))}
          </ul>
        ) : (
          <Link href="/" className="text-sm font-semibold text-primary hover:underline">{t('home.browseCities')}</Link>
        )}
      </Card>
      <Card>
        <SectionHeader title={t('account.interests')} />
        <InterestsEditor initial={(interests.data ?? []).map((row) => row.category_slug)} />
      </Card>
    </>
  );
}

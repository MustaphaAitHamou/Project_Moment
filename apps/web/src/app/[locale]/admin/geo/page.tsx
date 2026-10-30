import { listCategories, listCities, listCountries } from '@tamurt/api-client';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DataTable, Td } from '@/components/admin/data-table';
import { Badge } from '@/components/ui/badge';
import { PageHeader, SectionHeader } from '@/components/ui/page-header';
import type { AppLocale } from '@/i18n/routing';
import { nameOf } from '@/lib/format';
import { requireStaffViewer } from '@/lib/guards';
import { getSupabase } from '@/lib/session';

/** Référentiels (pays, villes, catégories) : lecture seule dans l'interface, modifiables par migration. */
export default async function GeoPage({ params }: PageProps<'/[locale]/admin/geo'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireStaffViewer(locale, '/admin/geo');
  const t = await getTranslations();
  const supabase = await getSupabase();
  const [countries, cities, categories] = await Promise.all([listCountries(supabase), listCities(supabase), listCategories(supabase)]);
  return (
    <>
      <PageHeader title={`${t('admin.geo')} · ${t('admin.categories')}`} />
      <section>
        <SectionHeader title={t('nav.countries')} />
        <DataTable head={['Code', t('common.name'), 'Devise', 'Fuseau', 'Billetterie réelle', 'Revente réelle']}>
          {countries.map((country) => (
            <tr key={country.code}>
              <Td className="font-mono">{country.code}</Td>
              <Td>{t(`countries.${country.code as 'FR'}`)}</Td>
              <Td>{country.currency}</Td>
              <Td>{country.default_timezone}</Td>
              <Td><Badge tone={country.ticket_sales_live_enabled ? 'success' : 'neutral'}>{country.ticket_sales_live_enabled ? 'on' : 'off'}</Badge></Td>
              <Td><Badge tone={country.resale_live_enabled ? 'success' : 'neutral'}>{country.resale_live_enabled ? 'on' : 'off'}</Badge></Td>
            </tr>
          ))}
        </DataTable>
      </section>
      <section>
        <SectionHeader title={t('nav.cities')} />
        <DataTable head={[t('common.city'), t('common.country'), 'Fuseau', 'Coordonnées']}>
          {cities.map((city) => (
            <tr key={city.id}>
              <Td>{nameOf(city.names, locale)}{city.is_featured ? <Badge tone="accent" className="ms-2">★</Badge> : null}</Td>
              <Td>{city.country_code}</Td>
              <Td>{city.timezone}</Td>
              <Td className="font-mono text-xs">{city.lat?.toFixed(3)}, {city.lng?.toFixed(3)}</Td>
            </tr>
          ))}
        </DataTable>
      </section>
      <section>
        <SectionHeader title={t('admin.categories')} />
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => <span key={category.slug} className="rounded-full px-3 py-1 text-sm font-semibold text-white" style={{ backgroundColor: category.color }}>{t(`categories.${category.slug as 'other'}`)}</span>)}
        </div>
      </section>
    </>
  );
}

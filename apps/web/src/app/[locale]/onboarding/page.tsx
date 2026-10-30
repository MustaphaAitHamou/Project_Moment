import { listCities } from '@tamurt/api-client';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { OnboardingWizard } from '@/components/account/onboarding-wizard';
import type { AppLocale } from '@/i18n/routing';
import { nameOf } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { preferredCountry } from '@/lib/search';
import { PRIVATE_METADATA } from '@/lib/seo';
import { getSupabase } from '@/lib/session';

export const metadata: Metadata = PRIVATE_METADATA;

export default async function OnboardingPage({ params }: PageProps<'/[locale]/onboarding'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireViewer(locale, '/onboarding');
  const cities = await listCities(await getSupabase()).catch(() => []);
  return (
    <div className="container-page py-10">
      <OnboardingWizard initialCountry={await preferredCountry(null)} cities={cities.map((city) => ({ id: city.id, name: nameOf(city.names, locale), countryCode: city.country_code }))} />
    </div>
  );
}

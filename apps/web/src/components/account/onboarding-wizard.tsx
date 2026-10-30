'use client';
import { COUNTRY_CODES, EVENT_CATEGORY_SLUGS, type CountryCode } from '@tamurt/core';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from '@/i18n/navigation';
import { completeOnboardingAction } from '@/lib/actions/account';
import { cn } from '@/lib/utils';

interface CityOption {
  id: string;
  name: string;
  countryCode: string;
}

const chip = (selected: boolean) => cn('rounded-full border px-3.5 py-1.5 text-sm font-semibold', selected ? 'border-primary bg-primary-soft text-primary' : 'border-line-strong bg-surface hover:bg-sunken');

/** Premier lancement : pays, villes suivies et centres d'intérêt (tout est facultatif). */
export function OnboardingWizard({ cities, initialCountry }: { cities: CityOption[]; initialCountry: CountryCode | null }) {
  const t = useTranslations();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState<CountryCode | null>(initialCountry);
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const finish = () =>
    startTransition(async () => {
      const result = await completeOnboardingAction({ countryCode: country, cityIds, categories });
      if (result.ok) {
        router.replace(country ? { pathname: '/', query: { country } } : '/');
        router.refresh();
      } else setError(result.message);
    });

  const steps = [
    <div key="welcome" className="space-y-4">
      {([1, 2, 3] as const).map((n) => (
        <div key={n}>
          <h2 className="font-display text-lg font-bold">{t(`onboarding.slide${n}Title`)}</h2>
          <p className="text-muted">{t(`onboarding.slide${n}Text`)}</p>
        </div>
      ))}
    </div>,
    <div key="country" className="space-y-3">
      <h2 className="font-display text-xl font-bold">{t('onboarding.chooseCountryTitle')}</h2>
      <p className="text-muted">{t('onboarding.chooseCountryText')}</p>
      <div className="flex flex-wrap gap-2">
        {COUNTRY_CODES.map((code) => <button key={code} type="button" aria-pressed={country === code} className={chip(country === code)} onClick={() => setCountry(code)}>{t(`countries.${code}`)}</button>)}
      </div>
    </div>,
    <div key="cities" className="space-y-3">
      <h2 className="font-display text-xl font-bold">{t('onboarding.chooseCitiesTitle')}</h2>
      <p className="text-muted">{t('onboarding.chooseCitiesText')}</p>
      <div className="flex flex-wrap gap-2">
        {cities.filter((city) => !country || city.countryCode === country).map((city) => <button key={city.id} type="button" aria-pressed={cityIds.includes(city.id)} className={chip(cityIds.includes(city.id))} onClick={() => setCityIds(toggle(cityIds, city.id))}>{city.name}</button>)}
      </div>
    </div>,
    <div key="interests" className="space-y-3">
      <h2 className="font-display text-xl font-bold">{t('onboarding.interestsTitle')}</h2>
      <p className="text-muted">{t('onboarding.interestsText')}</p>
      <div className="flex flex-wrap gap-2">
        {EVENT_CATEGORY_SLUGS.map((slug) => <button key={slug} type="button" aria-pressed={categories.includes(slug)} className={chip(categories.includes(slug))} onClick={() => setCategories(toggle(categories, slug))}>{t(`categories.${slug}`)}</button>)}
      </div>
    </div>,
  ];

  return (
    <Card className="mx-auto max-w-2xl space-y-6 p-6 sm:p-8">
      <div className="flex gap-1.5" aria-hidden>{steps.map((_, index) => <span key={index} className={cn('h-1.5 flex-1 rounded-full', index <= step ? 'bg-primary' : 'bg-sunken')} />)}</div>
      {steps[step]}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={finish} disabled={pending}>{t('onboarding.skip')}</Button>
        <div className="flex gap-2">
          {step > 0 ? <Button variant="outline" onClick={() => setStep(step - 1)}>{t('common.previous')}</Button> : null}
          {step < steps.length - 1 ? <Button onClick={() => setStep(step + 1)}>{t('common.next')}</Button> : <Button loading={pending} onClick={finish}>{t('onboarding.getStarted')}</Button>}
        </div>
      </div>
    </Card>
  );
}

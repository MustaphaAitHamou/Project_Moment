import { COUNTRY_CODES } from '@tamurt/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslations } from 'use-intl';
import { AppText, Button, Chip, Row, Screen } from '@/components/ui';
import { completeOnboarding } from '@/lib/onboarding';

/** Premier lancement : présentation et choix du pays (aucune permission demandée ici). */
export default function OnboardingScreen() {
  const t = useTranslations();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState<string | null>(null);
  const finish = async () => {
    await completeOnboarding(country);
    router.replace('/(tabs)');
  };
  return (
    <Screen edges={['top', 'bottom']}>
      {step === 0 ? (
        <>
          {([1, 2, 3] as const).map((n) => (
            <AppText key={n} variant={n === 1 ? 'display' : 'body'}>{t(`onboarding.slide${n}Title`)} — {t(`onboarding.slide${n}Text`)}</AppText>
          ))}
          <Button title={t('common.next')} onPress={() => setStep(1)} />
        </>
      ) : (
        <>
          <AppText variant="title">{t('onboarding.chooseCountryTitle')}</AppText>
          <AppText variant="muted">{t('onboarding.chooseCountryText')}</AppText>
          <Row>{COUNTRY_CODES.map((code) => <Chip key={code} label={t(`countries.${code}`)} selected={country === code} onPress={() => setCountry(code)} />)}</Row>
          <Button title={t('onboarding.getStarted')} onPress={() => void finish()} />
        </>
      )}
      <Button title={t('onboarding.skip')} variant="ghost" onPress={() => void finish()} />
    </Screen>
  );
}

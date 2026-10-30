import { Link, Stack } from 'expo-router';
import { useTranslations } from 'use-intl';
import { Button, EmptyState, Screen } from '@/components/ui';

export default function NotFound() {
  const t = useTranslations('common');
  return (
    <>
      <Stack.Screen options={{ title: t('pageNotFound') }} />
      <Screen>
        <EmptyState icon="compass-outline" title={t('pageNotFound')} text={t('pageNotFoundText')} action={<Link href="/" asChild><Button title={t('goHome')} /></Link>} />
      </Screen>
    </>
  );
}

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/auth/auth-card';
import { VerifyEmail } from '@/components/beta/verify-email';
import { Alert } from '@/components/ui/alert';
import type { AppLocale } from '@/i18n/routing';
import { PRIVATE_METADATA } from '@/lib/seo';
import { firstParam } from '@/lib/utils';

export const metadata: Metadata = PRIVATE_METADATA;

export default async function BetaVerifyPage({ params, searchParams }: PageProps<'/[locale]/beta/verify'>) {
  setRequestLocale((await params).locale as AppLocale);
  const token = firstParam((await searchParams).token) ?? '';
  const t = await getTranslations('beta');
  return (
    <AuthCard title={t('title')} subtitle={t('steps.verify')}>
      <div className="flex justify-center">{/^[A-Za-z0-9_-]{16,128}$/.test(token) ? <VerifyEmail token={token} /> : <Alert tone="danger">{t('verifyFailed')}</Alert>}</div>
    </AuthCard>
  );
}

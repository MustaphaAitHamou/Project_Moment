import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/auth/auth-card';
import { RedeemForm } from '@/components/beta/redeem-form';
import { Alert } from '@/components/ui/alert';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { requireViewer } from '@/lib/guards';
import { PRIVATE_METADATA } from '@/lib/seo';

export const metadata: Metadata = PRIVATE_METADATA;

export default async function BetaRedeemPage({ params }: PageProps<'/[locale]/beta/redeem'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, '/beta/redeem');
  const t = await getTranslations();
  return (
    <AuthCard title={t('beta.redeemTitle')}>
      {viewer.roles.includes('beta_tester') ? (
        <Alert tone="success" title={t('beta.redeemed')} action={<Link href="/account/beta" className={buttonClasses({ size: 'sm' })}>{t('beta.testerArea')}</Link>} />
      ) : !viewer.emailVerified ? (
        <Alert tone="warning">{t('errors.email_not_verified')}</Alert>
      ) : (
        <RedeemForm />
      )}
    </AuthCard>
  );
}

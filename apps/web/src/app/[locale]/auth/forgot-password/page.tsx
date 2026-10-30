import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/auth/auth-card';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { PRIVATE_METADATA } from '@/lib/seo';

export const metadata: Metadata = PRIVATE_METADATA;

export default async function ForgotPasswordPage({ params }: PageProps<'/[locale]/auth/forgot-password'>) {
  setRequestLocale((await params).locale as AppLocale);
  const t = await getTranslations('auth');
  return (
    <AuthCard title={t('forgotTitle')} footer={<Link href="/auth/login" className="font-semibold text-primary hover:underline">{t('login')}</Link>}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}

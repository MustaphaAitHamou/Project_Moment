import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/auth/auth-card';
import { UpdatePasswordForm } from '@/components/auth/update-password-form';
import type { AppLocale } from '@/i18n/routing';
import { requireViewer } from '@/lib/guards';
import { PRIVATE_METADATA } from '@/lib/seo';

export const metadata: Metadata = PRIVATE_METADATA;

/** Atteinte via le lien de réinitialisation (session de récupération posée par /auth/confirm). */
export default async function UpdatePasswordPage({ params }: PageProps<'/[locale]/auth/update-password'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  await requireViewer(locale, '/auth/update-password');
  const t = await getTranslations('auth');
  return (
    <AuthCard title={t('updatePasswordTitle')}>
      <UpdatePasswordForm />
    </AuthCard>
  );
}

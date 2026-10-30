import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';
import { Alert } from '@/components/ui/alert';
import { Link, redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { pageMetadata } from '@/lib/seo';
import { getViewer } from '@/lib/session';
import { firstParam, safeReturnPath } from '@/lib/utils';

export async function generateMetadata({ params }: PageProps<'/[locale]/auth/login'>): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return pageMetadata({ locale, path: '/auth/login', title: t('loginTitle'), noindex: true });
}

export default async function LoginPage({ params, searchParams }: PageProps<'/[locale]/auth/login'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const query = await searchParams;
  const next = safeReturnPath(firstParam(query.next), '/account');
  if (await getViewer()) redirect({ href: next, locale });
  const t = await getTranslations('auth');
  const failed = firstParam(query.error) === 'confirmation_failed';
  return (
    <AuthCard
      title={t('loginTitle')}
      subtitle={t('loginSubtitle')}
      footer={<>{t('noAccount')} <Link href={{ pathname: '/auth/register', query: { next } }} className="font-semibold text-primary hover:underline">{t('register')}</Link></>}
    >
      {failed ? <Alert tone="danger" className="mb-4">{t('confirmationFailed')}</Alert> : null}
      <LoginForm next={next} />
    </AuthCard>
  );
}

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/auth/auth-card';
import { RegisterForm } from '@/components/auth/register-form';
import { Link, redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { pageMetadata } from '@/lib/seo';
import { getViewer } from '@/lib/session';
import { firstParam, safeReturnPath } from '@/lib/utils';

export async function generateMetadata({ params }: PageProps<'/[locale]/auth/register'>): Promise<Metadata> {
  const locale = (await params).locale as AppLocale;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return pageMetadata({ locale, path: '/auth/register', title: t('registerTitle'), description: t('registerSubtitle') });
}

export default async function RegisterPage({ params, searchParams }: PageProps<'/[locale]/auth/register'>) {
  const locale = (await params).locale as AppLocale;
  setRequestLocale(locale);
  const next = safeReturnPath(firstParam((await searchParams).next), '/onboarding');
  if (await getViewer()) redirect({ href: '/account', locale });
  const t = await getTranslations('auth');
  return (
    <AuthCard
      title={t('registerTitle')}
      subtitle={t('registerSubtitle')}
      footer={<>{t('hasAccount')} <Link href={{ pathname: '/auth/login', query: { next } }} className="font-semibold text-primary hover:underline">{t('login')}</Link></>}
    >
      <RegisterForm next={next} />
    </AuthCard>
  );
}

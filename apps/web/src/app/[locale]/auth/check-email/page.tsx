import { MailCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AuthCard } from '@/components/auth/auth-card';
import type { AppLocale } from '@/i18n/routing';
import { PRIVATE_METADATA } from '@/lib/seo';
import { firstParam } from '@/lib/utils';

export const metadata: Metadata = PRIVATE_METADATA;

export default async function CheckEmailPage({ params, searchParams }: PageProps<'/[locale]/auth/check-email'>) {
  setRequestLocale((await params).locale as AppLocale);
  const email = (firstParam((await searchParams).email) ?? '').slice(0, 200);
  const t = await getTranslations('auth');
  return (
    <AuthCard title={t('checkEmailTitle')}>
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary"><MailCheck className="h-8 w-8" aria-hidden /></span>
        <p className="text-muted">{t('checkEmailText', { email: email || '…' })}</p>
      </div>
    </AuthCard>
  );
}

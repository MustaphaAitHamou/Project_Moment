'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@tamurt/validation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useTranslateError } from '@/hooks/use-translate-error';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const translate = useTranslateError();
  const locale = useLocale();
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });
  const onSubmit = form.handleSubmit(async ({ email }) => {
    await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/confirm?next=/${locale}/auth/update-password` });
    // Message identique dans tous les cas (pas d'énumération des comptes).
    setSent(true);
  });
  if (sent) return <Alert tone="success">{t('resetSent')}</Alert>;
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-muted">{t('forgotHelp')}</p>
      <Field label={t('email')} htmlFor="email" error={translate(form.formState.errors.email?.message)}>
        <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>{t('sendResetLink')}</Button>
    </form>
  );
}

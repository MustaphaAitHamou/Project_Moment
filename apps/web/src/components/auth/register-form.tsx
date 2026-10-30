'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { COUNTRY_CODES } from '@tamurt/core';
import { signUpSchema } from '@tamurt/validation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select } from '@/components/ui/field';
import { useTranslateError } from '@/hooks/use-translate-error';
import { Link, useRouter } from '@/i18n/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type FormValues = z.input<typeof signUpSchema>;

export function RegisterForm({ next }: { next: string }) {
  const t = useTranslations();
  const translate = useTranslateError();
  const locale = useLocale() as 'fr' | 'en' | 'ar';
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<FormValues>({ resolver: zodResolver(signUpSchema), defaultValues: { email: '', password: '', displayName: '', locale, acceptTerms: false as unknown as true } });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const { error: authError } = await getSupabaseBrowserClient().auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(`/${locale}${next}`)}`,
        data: { display_name: values.displayName, locale: values.locale, country_code: values.countryCode ?? null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      },
    });
    if (authError) {
      setError(authError.status === 429 ? t('auth.tooManyAttempts') : authError.code === 'weak_password' ? t('validation.password_weak') : t('common.unknownError'));
      return;
    }
    // Réponse identique que l'adresse soit nouvelle ou déjà utilisée (pas d'énumération des comptes).
    router.push({ pathname: '/auth/check-email', query: { email: values.email } });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label={t('auth.displayName')} htmlFor="displayName" error={translate(errors.displayName?.message)}>
        <Input id="displayName" autoComplete="nickname" aria-invalid={Boolean(errors.displayName)} {...form.register('displayName')} />
      </Field>
      <Field label={t('auth.email')} htmlFor="email" error={translate(errors.email?.message)}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} {...form.register('email')} />
      </Field>
      <Field label={t('auth.password')} htmlFor="password" hint={t('auth.passwordHint')} error={translate(errors.password?.message)}>
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...form.register('password')} />
      </Field>
      <Field label={t('common.country')} htmlFor="countryCode" optionalLabel={t('common.optional')}>
        <Select id="countryCode" {...form.register('countryCode', { setValueAs: (value: string) => value || undefined })}>
          <option value="">—</option>
          {COUNTRY_CODES.map((code) => <option key={code} value={code}>{t(`countries.${code}`)}</option>)}
        </Select>
      </Field>
      <input type="hidden" {...form.register('locale')} />
      <div>
        <Checkbox
          label={
            <>
              {t('auth.acceptTerms')}{' '}
              <Link href="/legal/terms" className="font-semibold text-primary underline" target="_blank">{t('legal.terms')}</Link>
              {' · '}
              <Link href="/legal/privacy" className="font-semibold text-primary underline" target="_blank">{t('legal.privacy')}</Link>
            </>
          }
          {...form.register('acceptTerms')}
        />
        {errors.acceptTerms ? <p className="mt-1 text-xs font-medium text-danger" role="alert">{translate(errors.acceptTerms.message)}</p> : null}
      </div>
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>{t('auth.register')}</Button>
    </form>
  );
}

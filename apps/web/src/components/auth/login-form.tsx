'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, type SignInInput } from '@tamurt/validation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useTranslateError } from '@/hooks/use-translate-error';
import { Link, useRouter } from '@/i18n/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const t = useTranslations('auth');
  const translate = useTranslateError();
  const router = useRouter();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const form = useForm<SignInInput>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const { error: authError } = await getSupabaseBrowserClient().auth.signInWithPassword(values);
    if (authError) {
      const code = authError.code ?? '';
      setError(code === 'email_not_confirmed' ? t('emailNotConfirmed') : authError.status === 429 || code.includes('rate_limit') ? t('tooManyAttempts') : t('invalidCredentials'));
      return;
    }
    router.replace(next);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label={t('email')} htmlFor="email" error={translate(form.formState.errors.email?.message)}>
        <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(form.formState.errors.email)} {...form.register('email')} />
      </Field>
      <Field label={t('password')} htmlFor="password" error={translate(form.formState.errors.password?.message)}>
        <Input id="password" type="password" autoComplete="current-password" aria-invalid={Boolean(form.formState.errors.password)} {...form.register('password')} />
      </Field>
      <div className="text-end text-sm">
        <Link href="/auth/forgot-password" className="font-semibold text-primary hover:underline">{t('forgotPassword')}</Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>{t('login')}</Button>
    </form>
  );
}

'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { updatePasswordSchema, type UpdatePasswordInput } from '@tamurt/validation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { useTranslateError } from '@/hooks/use-translate-error';
import { Link } from '@/i18n/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export function UpdatePasswordForm() {
  const t = useTranslations();
  const translate = useTranslateError();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<UpdatePasswordInput>({ resolver: zodResolver(updatePasswordSchema), defaultValues: { password: '', confirmPassword: '' } });
  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    const { error: authError } = await getSupabaseBrowserClient().auth.updateUser({ password });
    if (authError) {
      setError(authError.code === 'same_password' ? t('validation.invalid') : authError.code === 'weak_password' ? t('validation.password_weak') : t('auth.sessionExpired'));
      return;
    }
    setDone(true);
  });
  if (done) {
    return <Alert tone="success" title={t('auth.passwordUpdated')} action={<Link href="/account" className={buttonClasses({ size: 'sm' })}>{t('nav.account')}</Link>} />;
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Field label={t('auth.password')} htmlFor="password" hint={t('auth.passwordHint')} error={translate(form.formState.errors.password?.message)}>
        <Input id="password" type="password" autoComplete="new-password" {...form.register('password')} />
      </Field>
      <Field label={t('auth.confirmPassword')} htmlFor="confirmPassword" error={translate(form.formState.errors.confirmPassword?.message)}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...form.register('confirmPassword')} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>{t('auth.updatePassword')}</Button>
    </form>
  );
}

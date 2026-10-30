'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { COUNTRY_CODES } from '@tamurt/core';
import { betaWaitlistSchema } from '@tamurt/validation';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useTranslateError } from '@/hooks/use-translate-error';

type Values = z.input<typeof betaWaitlistSchema>;

export function WaitlistForm() {
  const t = useTranslations();
  const translate = useTranslateError();
  const locale = useLocale() as 'fr' | 'en' | 'ar';
  const api = useApi();
  const [result, setResult] = useState<{ tone: 'success' | 'info' | 'danger'; text: string } | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(betaWaitlistSchema),
    defaultValues: { email: '', fullName: '', countryCode: 'FR', platforms: ['web'], locale, consent: false as unknown as true },
  });
  const errors = form.formState.errors;
  const platforms = useWatch({ control: form.control, name: 'platforms' }) ?? [];

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await api.beta.join(betaWaitlistSchema.parse(values));
      setResult(response.emailConfigured ? { tone: 'success', text: t('beta.joined') } : { tone: 'info', text: t('beta.emailNotConfigured') });
      form.reset();
    } catch (caught) {
      setResult({ tone: 'danger', text: errorMessage(caught, t('common.unknownError')) });
    }
  });

  if (result && result.tone !== 'danger') return <Alert tone={result.tone}>{result.text}</Alert>;

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Field label={t('beta.fullName')} htmlFor="fullName" error={translate(errors.fullName?.message)}>
        <Input id="fullName" autoComplete="name" {...form.register('fullName')} />
      </Field>
      <Field label={t('beta.email')} htmlFor="beta-email" error={translate(errors.email?.message)}>
        <Input id="beta-email" type="email" autoComplete="email" {...form.register('email')} />
      </Field>
      <Field label={t('beta.country')} htmlFor="beta-country">
        <Select id="beta-country" {...form.register('countryCode')}>
          {COUNTRY_CODES.map((code) => <option key={code} value={code}>{t(`countries.${code}`)}</option>)}
        </Select>
      </Field>
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium">{t('beta.platforms')}</legend>
        <div className="flex flex-wrap gap-3 pt-1">
          {(['ios', 'android', 'web'] as const).map((platform) => (
            <Checkbox
              key={platform}
              label={platform === 'ios' ? t('beta.platformIos') : platform === 'android' ? t('beta.platformAndroid') : t('beta.platformWeb')}
              checked={platforms.includes(platform)}
              onChange={(e) => form.setValue('platforms', e.target.checked ? [...platforms, platform] : platforms.filter((p) => p !== platform), { shouldValidate: true })}
            />
          ))}
        </div>
        {errors.platforms ? <p className="text-xs font-medium text-danger">{translate(errors.platforms.message)}</p> : null}
      </fieldset>
      <Field label={t('beta.socialHandle')} htmlFor="socialHandle" className="sm:col-span-2">
        <Input id="socialHandle" {...form.register('socialHandle', { setValueAs: (v: string) => v || undefined })} />
      </Field>
      <Field label={t('beta.motivation')} htmlFor="motivation" className="sm:col-span-2">
        <Textarea id="motivation" maxLength={1000} {...form.register('motivation', { setValueAs: (v: string) => v || undefined })} />
      </Field>
      <div className="sm:col-span-2">
        <Checkbox label={t('beta.consent')} {...form.register('consent')} />
        {errors.consent ? <p className="mt-1 text-xs font-medium text-danger">{translate(errors.consent.message)}</p> : null}
      </div>
      {result?.tone === 'danger' ? <Alert tone="danger" className="sm:col-span-2">{result.text}</Alert> : null}
      <Button type="submit" size="lg" className="sm:col-span-2" loading={form.formState.isSubmitting}>{t('beta.join')}</Button>
    </form>
  );
}

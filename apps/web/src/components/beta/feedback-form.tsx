'use client';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export function FeedbackForm() {
  const t = useTranslations();
  const api = useApi();
  const router = useRouter();
  const [kind, setKind] = useState<'bug' | 'suggestion' | 'rating'>('bug');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [screen, setScreen] = useState('');
  const [rating, setRating] = useState(0);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setResult(null);
        try {
          await api.beta.feedback({
            kind,
            platform: 'web',
            ...(title.trim() ? { title: title.trim() } : {}),
            ...(message.trim() ? { message: message.trim() } : {}),
            ...(rating ? { rating } : {}),
            ...(screen.trim() ? { screen: screen.trim() } : {}),
            deviceInfo: { userAgent: navigator.userAgent.slice(0, 200), viewport: `${window.innerWidth}x${window.innerHeight}`, language: navigator.language },
          } as never);
          setResult({ ok: true, text: t('beta.feedbackSent') });
          setTitle('');
          setMessage('');
          setRating(0);
          router.refresh();
        } catch (caught) {
          setResult({ ok: false, text: errorMessage(caught, t('common.unknownError')) });
        }
        setBusy(false);
      }}
    >
      <Field label={t('beta.feedbackKind')} htmlFor="feedback-kind">
        <Select id="feedback-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          {(['bug', 'suggestion', 'rating'] as const).map((value) => <option key={value} value={value}>{t(`beta.feedbackKinds.${value}`)}</option>)}
        </Select>
      </Field>
      {kind !== 'rating' ? (
        <>
          <Field label={t('beta.feedbackTitleLabel')} htmlFor="feedback-title">
            <Input id="feedback-title" maxLength={140} required value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={t('beta.feedbackMessage')} htmlFor="feedback-message" hint={kind === 'bug' ? t('beta.feedbackBugHelp') : undefined}>
            <Textarea id="feedback-message" maxLength={4000} required value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Field label={t('beta.feedbackScreen')} htmlFor="feedback-screen" optionalLabel={t('common.optional')}>
            <Input id="feedback-screen" maxLength={200} value={screen} onChange={(e) => setScreen(e.target.value)} />
          </Field>
        </>
      ) : null}
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">{t('beta.feedbackRating')}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" aria-label={`${value}/5`} aria-pressed={rating === value} onClick={() => setRating(value)} className="rounded p-1">
              <Star className={cn('h-7 w-7', value <= rating ? 'fill-accent text-accent' : 'text-line-strong')} aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
      {result ? <Alert tone={result.ok ? 'success' : 'danger'}>{result.text}</Alert> : null}
      <Button type="submit" loading={busy} disabled={kind === 'rating' ? rating === 0 : !title.trim() || !message.trim()}>{t('common.send')}</Button>
    </form>
  );
}

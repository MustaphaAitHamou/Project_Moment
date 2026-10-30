'use client';
import { CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button, buttonClasses } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { Link, useRouter } from '@/i18n/navigation';
import { cancelRegistrationAction, registerForEventAction } from '@/lib/actions/events';

/** Inscription gratuite (événements sans billetterie, avec jauge éventuelle). */
export function RegisterBox({
  eventId,
  registered: initialRegistered,
  signedIn,
  spotsLeft,
  returnTo,
}: {
  eventId: string;
  registered: boolean;
  signedIn: boolean;
  spotsLeft: number | null;
  returnTo: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [registered, setRegistered] = useState(initialRegistered);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const full = spotsLeft !== null && spotsLeft <= 0 && !registered;

  if (!signedIn) {
    return (
      <Link href={{ pathname: '/auth/login', query: { next: returnTo } }} className={buttonClasses({ size: 'lg', className: 'w-full' })}>
        {t('event.register')}
      </Link>
    );
  }

  const submit = (action: 'register' | 'cancel') =>
    startTransition(async () => {
      const result = action === 'register' ? await registerForEventAction(eventId, quantity) : await cancelRegistrationAction(eventId);
      if (result.ok) {
        setRegistered(action === 'register');
        setFeedback({ tone: 'success', text: action === 'register' ? t('event.registrationConfirmed') : t('event.registrationCancelled') });
        router.refresh();
      } else {
        setFeedback({ tone: 'danger', text: result.message });
      }
    });

  return (
    <div className="space-y-3">
      {spotsLeft !== null && spotsLeft > 0 ? <p className="text-sm text-muted">{t('event.spotsLeft', { count: spotsLeft })}</p> : null}
      {registered ? (
        <>
          <p className="flex items-center gap-2 font-semibold text-success"><CircleCheck className="h-5 w-5" aria-hidden />{t('event.registered')}</p>
          <Button variant="outline" className="w-full" loading={pending} onClick={() => submit('cancel')}>{t('event.cancelRegistration')}</Button>
        </>
      ) : full ? (
        <p className="font-semibold text-danger">{t('event.full')}</p>
      ) : (
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="registration-quantity">{t('common.quantity')}</label>
          <Select id="registration-quantity" className="w-20" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
            {Array.from({ length: Math.min(spotsLeft ?? 10, 10) }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
          <Button size="lg" className="flex-1" loading={pending} onClick={() => submit('register')}>{t('event.register')}</Button>
        </div>
      )}
      {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}
    </div>
  );
}

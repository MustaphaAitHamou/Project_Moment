'use client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/field';
import { useRouter } from '@/i18n/navigation';
import { postAnnouncementAction } from '@/lib/actions/organizer';

export function AnnouncementForm({ eventId }: { eventId: string }) {
  const t = useTranslations('organizer');
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const result = await postAnnouncementAction(eventId, { title: title.trim(), body: body.trim() });
          if (result.ok) {
            setTitle('');
            setBody('');
            setMessage({ ok: true, text: t('announcementSent') });
            router.refresh();
          } else setMessage({ ok: false, text: result.message });
        });
      }}
    >
      <Field label={t('announcementTitle')} htmlFor="ann-title" required>
        <Input id="ann-title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label={t('announcementBody')} htmlFor="ann-body" required>
        <Textarea id="ann-body" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      {message ? <Alert tone={message.ok ? 'success' : 'danger'}>{message.text}</Alert> : null}
      <Button type="submit" loading={pending} disabled={title.trim().length < 3 || body.trim().length < 3}>{t('newAnnouncement')}</Button>
    </form>
  );
}

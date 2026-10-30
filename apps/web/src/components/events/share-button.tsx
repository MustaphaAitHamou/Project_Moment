'use client';
import { Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useApi } from '@/hooks/use-api';

export function ShareButton({ eventId, title, url }: { eventId: string; title: string; url: string }) {
  const t = useTranslations();
  const api = useApi();
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = t('event.shareText', { title });
    try {
      if (navigator.share) await navigator.share({ title, text, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
      void api.events.track(eventId, 'share').catch(() => undefined);
    } catch {
      // partage annulé par l'utilisateur
    }
  }

  return (
    <button type="button" onClick={share} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold hover:bg-sunken">
      <Share2 className="h-5 w-5" aria-hidden />
      <span role="status">{copied ? t('common.linkCopied') : t('event.share')}</span>
    </button>
  );
}

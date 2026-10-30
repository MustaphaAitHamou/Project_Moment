'use client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button, type ButtonVariant } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import type { ActionResult } from '@/lib/actions/result';

/**
 * Bouton d'action d'administration. `action` est une action serveur liée (bind) ; si `requireNote`
 * est vrai, une note (motif) est demandée avant l'envoi.
 */
export function AdminAction({ action, label, variant = 'outline', requireNote = false }: { action: (note?: string) => Promise<ActionResult<unknown>>; label: string; variant?: ButtonVariant; requireNote?: boolean }) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = () =>
    startTransition(async () => {
      const result = await action(text.trim() || undefined);
      if (result.ok) {
        setOpen(false);
        setText('');
        setError(null);
        router.refresh();
      } else setError(result.message);
    });
  if (requireNote && open) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <input aria-label={t('note')} placeholder={t('noteRequired')} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} className="w-56 rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-sm" />
        <Button size="sm" variant={variant} loading={pending} disabled={!text.trim()} onClick={run}>{label}</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>×</Button>
        {error ? <span className="text-xs text-danger" role="alert">{error}</span> : null}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant={variant} loading={pending} onClick={() => (requireNote ? setOpen(true) : run())}>{label}</Button>
      {error ? <span className="text-xs text-danger" role="alert">{error}</span> : null}
    </span>
  );
}

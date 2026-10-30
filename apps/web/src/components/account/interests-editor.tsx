'use client';
import { EVENT_CATEGORY_SLUGS } from '@tamurt/core';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { setInterestsAction } from '@/lib/actions/account';
import { cn } from '@/lib/utils';

export function InterestsEditor({ initial }: { initial: string[] }) {
  const t = useTranslations();
  const [selected, setSelected] = useState<string[]>(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toggle = (slug: string) => setSelected((current) => (current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug]));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {EVENT_CATEGORY_SLUGS.map((slug) => (
          <button key={slug} type="button" aria-pressed={selected.includes(slug)} onClick={() => toggle(slug)} className={cn('rounded-full border px-3.5 py-1.5 text-sm font-semibold', selected.includes(slug) ? 'border-primary bg-primary-soft text-primary' : 'border-line-strong bg-surface hover:bg-sunken')}>
            {t(`categories.${slug}`)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" loading={pending} onClick={() => startTransition(async () => { const r = await setInterestsAction(selected); setStatus(r.ok ? t('common.saved') : r.message); })}>{t('common.save')}</Button>
        <span role="status" className="text-sm text-muted">{status}</span>
      </div>
    </div>
  );
}

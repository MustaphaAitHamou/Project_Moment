'use client';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { reportListingAction } from '@/lib/actions/resale';

const REASONS = ['counterfeit_ticket', 'price_abuse', 'scam', 'spam', 'other'] as const;

export function ReportListing({ listingId }: { listingId: string }) {
  const t = useTranslations('resale');
  const [reason, setReason] = useState<(typeof REASONS)[number]>('counterfeit_ticket');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (message) return <p className="text-xs text-muted" role="status">{message}</p>;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-muted hover:text-danger">{t('reportSeller')}</summary>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select aria-label={t('reportSeller')} value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])} className="rounded-md border border-line-strong bg-surface px-2 py-1">
          {REASONS.map((value) => <option key={value} value={value}>{t(`reportReasons.${value}`)}</option>)}
        </select>
        <button type="button" disabled={pending} className="rounded-full bg-danger px-3 py-1 font-semibold text-on-danger" onClick={() => startTransition(async () => { const r = await reportListingAction({ listingId, reason }); setMessage(r.ok ? t('reportSent') : r.message); })}>
          OK
        </button>
      </div>
    </details>
  );
}

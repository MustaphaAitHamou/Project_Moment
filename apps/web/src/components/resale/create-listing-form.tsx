'use client';
import { bpsOf, isCurrencyCode, parseMajorToMinor } from '@tamurt/core';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { money } from '@/lib/format';

export interface EligibleTicket {
  id: string;
  label: string;
}

interface Quote {
  enabled: boolean;
  currency: string;
  original_price_minor: number;
  min_allowed_price_minor: number;
  max_allowed_price_minor: number;
  buyer_fee_bps: number;
  buyer_fee_fixed_minor: number;
  seller_fee_bps: number;
}

/** Mise en vente au prix plafonné (contrôlé à nouveau côté serveur et en base). */
export function CreateListingForm({ tickets, preselected }: { tickets: EligibleTicket[]; preselected?: string }) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const api = useApi();
  const router = useRouter();
  const [ticketId, setTicketId] = useState(preselected && tickets.some((ticket) => ticket.id === preselected) ? preselected : (tickets[0]?.id ?? ''));
  // Devis associé au billet sélectionné (ignoré s'il concerne un autre billet).
  const [quoted, setQuoted] = useState<{ ticketId: string; quote: Quote } | null>(null);
  const quote = quoted?.ticketId === ticketId ? quoted.quote : null;
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    let cancelled = false;
    api.resale
      .quote(ticketId)
      .then((result) => {
        if (cancelled) return;
        const q = result as unknown as Quote;
        setQuoted({ ticketId, quote: q });
        setPrice(isCurrencyCode(q.currency) ? (Number(q.max_allowed_price_minor) / 100).toFixed(q.currency === 'DZD' ? 0 : 2) : '');
      })
      .catch((caught) => !cancelled && setError(errorMessage(caught, t('common.unknownError'))));
    return () => {
      cancelled = true;
    };
  }, [api, ticketId, t]);

  let priceMinor: number | null = null;
  if (quote && isCurrencyCode(quote.currency) && price.trim()) {
    try {
      priceMinor = parseMajorToMinor(price.replace(',', '.'), quote.currency);
    } catch {
      priceMinor = null;
    }
  }
  const inRange = quote && priceMinor !== null && priceMinor >= Number(quote.min_allowed_price_minor) && priceMinor <= Number(quote.max_allowed_price_minor);
  const format = (amount: number) => (quote ? money(amount, quote.currency, locale) : '');

  if (success) return <Alert tone="success">{t('resale.listingPublished')}</Alert>;
  if (!tickets.length) return <p className="text-sm text-muted">{t('resale.noEligibleTickets')}</p>;

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!inRange || priceMinor === null) return;
        setBusy(true);
        setError(null);
        try {
          await api.resale.createListing({ ticketId, askingPriceMinor: priceMinor, ...(note.trim() ? { note: note.trim() } : {}) });
          setSuccess(true);
          router.refresh();
        } catch (caught) {
          setError(errorMessage(caught, t('common.unknownError')));
        }
        setBusy(false);
      }}
    >
      <Field label={t('resale.selectTicket')} htmlFor="listing-ticket">
        <Select id="listing-ticket" value={ticketId} onChange={(e) => setTicketId(e.target.value)}>
          {tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.label}</option>)}
        </Select>
      </Field>
      {quote && !quote.enabled ? <Alert tone="warning">{t('errors.resale_not_allowed')}</Alert> : null}
      {quote ? (
        <>
          <Field
            label={`${t('resale.askingPriceLabel')} (${quote.currency})`}
            htmlFor="listing-price"
            hint={t('resale.priceCapInfo', { min: format(Number(quote.min_allowed_price_minor)), max: format(Number(quote.max_allowed_price_minor)) })}
            error={price && !inRange ? t('validation.invalid_amount') : undefined}
          >
            <Input id="listing-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={Boolean(price && !inRange)} />
          </Field>
          {inRange && priceMinor !== null ? (
            <dl className="grid gap-1 rounded-lg bg-sunken p-4 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-2"><dt className="text-muted">{t('resale.originalPrice')}</dt><dd>{format(Number(quote.original_price_minor))}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">{t('resale.buyerFee')}</dt><dd>{format(bpsOf(priceMinor, quote.buyer_fee_bps) + Number(quote.buyer_fee_fixed_minor))}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted">{t('resale.sellerFee')}</dt><dd>{format(bpsOf(priceMinor, quote.seller_fee_bps))}</dd></div>
              <div className="flex justify-between gap-2 font-semibold"><dt>{t('resale.sellerPayout')}</dt><dd>{format(priceMinor - bpsOf(priceMinor, quote.seller_fee_bps))}</dd></div>
            </dl>
          ) : null}
          <Field label={t('resale.note')} htmlFor="listing-note">
            <Textarea id="listing-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
          </Field>
        </>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <Button type="submit" loading={busy} disabled={!inRange || !quote?.enabled}>{t('resale.publishListing')}</Button>
    </form>
  );
}

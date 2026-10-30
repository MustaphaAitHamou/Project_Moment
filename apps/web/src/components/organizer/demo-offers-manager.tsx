'use client';
import { parseMajorToMinor, type CurrencyCode } from '@tamurt/core';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/field';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useRouter } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { money } from '@/lib/format';

interface Offer {
  id: string;
  name: string;
  faceValueMinor: number;
  feeMinor: number;
  status: string;
  available: number | null;
}

/** Offres du fournisseur FICTIF : permet de tester tout le parcours d'achat sans vente réelle. */
export function DemoOffersManager({ eventId, currency, offers }: { eventId: string; currency: CurrencyCode; offers: Offer[] }) {
  const t = useTranslations();
  const locale = useLocale() as AppLocale;
  const api = useApi();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', price: '', fee: '0', capacity: '100', maxPerOrder: '8' });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function add() {
    setBusy('add');
    setMessage(null);
    try {
      await api.events.addDemoOffer(eventId, {
        name: form.name.trim(),
        priceMinor: parseMajorToMinor(form.price.replace(',', '.'), currency),
        feeMinor: parseMajorToMinor((form.fee || '0').replace(',', '.'), currency),
        capacity: Number(form.capacity),
        maxPerOrder: Number(form.maxPerOrder),
      });
      setForm({ ...form, name: '', price: '' });
      setMessage({ ok: true, text: t('common.saved') });
      router.refresh();
    } catch (caught) {
      setMessage({ ok: false, text: caught instanceof RangeError ? t('validation.invalid_amount') : errorMessage(caught, t('common.unknownError')) });
    }
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      <Alert tone="demo">{t('eventForm.ticketingDemoNote')}</Alert>
      {offers.length ? (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {offers.map((offer) => (
            <li key={offer.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 flex-1 font-semibold">{offer.name}</span>
              <span className="tabular-nums">{money(offer.faceValueMinor, currency, locale)}</span>
              {offer.available !== null ? <Badge>{t('checkout.available', { count: offer.available })}</Badge> : null}
              <Badge tone={offer.status === 'on_sale' ? 'success' : 'neutral'}>{offer.status}</Badge>
              {offer.status === 'on_sale' ? (
                <Button size="sm" variant="ghost" loading={busy === offer.id} onClick={async () => {
                  setBusy(offer.id);
                  try {
                    await api.events.closeDemoOffer(eventId, offer.id);
                    router.refresh();
                  } catch (caught) {
                    setMessage({ ok: false, text: errorMessage(caught, t('common.unknownError')) });
                  }
                  setBusy(null);
                }}>{t('common.close')}</Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-5">
        <Field label={t('tickets.offer')} htmlFor="offer-name" className="sm:col-span-2"><Input id="offer-name" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={`${t('common.price')} (${currency})`} htmlFor="offer-price"><Input id="offer-price" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
        <Field label={t('checkout.providerFees')} htmlFor="offer-fee"><Input id="offer-fee" inputMode="decimal" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></Field>
        <Field label={t('eventForm.capacity')} htmlFor="offer-capacity"><Input id="offer-capacity" type="number" min={1} max={5000} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} /></Field>
      </div>
      {message ? <Alert tone={message.ok ? 'success' : 'danger'}>{message.text}</Alert> : null}
      <Button variant="outline" loading={busy === 'add'} disabled={!form.name.trim() || !form.price.trim()} onClick={add}>{t('common.save')}</Button>
    </div>
  );
}

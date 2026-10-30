import { bpsOf, isCurrencyCode, parseMajorToMinor } from '@tamurt/core';
import { listMyTickets } from '@tamurt/api-client';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useLocale, useTranslations } from 'use-intl';
import { AppText, Banner, Button, Card, Chip, EmptyState, LoadingState, Screen, TextField } from '@/components/ui';
import { money } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useApi } from '@/providers/api';

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

export default function SellScreen() {
  const t = useTranslations();
  const locale = useLocale();
  const api = useApi();
  const router = useRouter();
  const params = useLocalSearchParams<{ ticket?: string }>();
  const tickets = useQuery({ queryKey: ['tickets-sellable'], queryFn: () => listMyTickets(supabase) });
  const eligible = (tickets.data ?? []).filter((ticket) => ticket.status === 'issued' && ticket.offer?.resale_allowed && new Date(ticket.event.starts_at) > new Date());
  const [ticketId, setTicketId] = useState<string | undefined>(params.ticket);
  const selected = ticketId ?? eligible[0]?.id;
  const quote = useQuery({ queryKey: ['quote', selected], enabled: Boolean(selected), queryFn: async () => (await api.resale.quote(selected!)) as unknown as Quote });
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (tickets.isLoading) return <LoadingState />;
  if (!eligible.length) return <EmptyState icon="pricetag-outline" title={t('resale.noEligibleTickets')} />;
  const q = quote.data;
  let priceMinor: number | null = null;
  if (q && isCurrencyCode(q.currency) && price.trim()) {
    try {
      priceMinor = parseMajorToMinor(price.replace(',', '.'), q.currency);
    } catch {
      priceMinor = null;
    }
  }
  const valid = q && priceMinor !== null && priceMinor >= Number(q.min_allowed_price_minor) && priceMinor <= Number(q.max_allowed_price_minor);
  return (
    <Screen edges={[]}>
      <Banner tone="demo" text={t('resale.demoNotice')} />
      <AppText variant="label">{t('resale.selectTicket')}</AppText>
      {eligible.map((ticket) => <Chip key={ticket.id} label={`${ticket.event.title} — ${ticket.offer?.name ?? ''}`} selected={selected === ticket.id} onPress={() => setTicketId(ticket.id)} />)}
      {q ? (
        <Card>
          <AppText variant="muted">{t('resale.priceCapInfo', { min: money(Number(q.min_allowed_price_minor), q.currency, locale), max: money(Number(q.max_allowed_price_minor), q.currency, locale) })}</AppText>
          <TextField label={`${t('resale.askingPriceLabel')} (${q.currency})`} keyboardType="decimal-pad" value={price} onChangeText={setPrice} error={price && !valid ? t('validation.invalid_amount') : undefined} />
          {valid && priceMinor !== null ? (
            <>
              <AppText variant="muted">{t('resale.buyerFee')} : {money(bpsOf(priceMinor, q.buyer_fee_bps) + Number(q.buyer_fee_fixed_minor), q.currency, locale)}</AppText>
              <AppText variant="label">{t('resale.sellerPayout')} : {money(priceMinor - bpsOf(priceMinor, q.seller_fee_bps), q.currency, locale)}</AppText>
            </>
          ) : null}
        </Card>
      ) : null}
      {message ? <Banner tone={message.ok ? 'success' : 'danger'} text={message.text} /> : null}
      <Button
        title={t('resale.publishListing')}
        loading={busy}
        disabled={!valid || !q?.enabled}
        onPress={async () => {
          setBusy(true);
          try {
            await api.resale.createListing({ ticketId: selected!, askingPriceMinor: priceMinor! });
            setMessage({ ok: true, text: t('resale.listingPublished') });
            setTimeout(() => router.back(), 900);
          } catch (error) {
            setMessage({ ok: false, text: (error as Error).message });
          }
          setBusy(false);
        }}
      />
    </Screen>
  );
}

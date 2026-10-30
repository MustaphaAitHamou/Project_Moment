import { toAppError } from '@tamurt/core';
import { checkout } from '@tamurt/server';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CheckoutFlow } from '@/components/checkout/checkout-flow';
import { PageHeader } from '@/components/ui/page-header';
import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { eventDateTime } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { PRIVATE_METADATA } from '@/lib/seo';
import { getServerContext } from '@/lib/server-context';
import { getAuthUser } from '@/lib/session';

export const metadata: Metadata = PRIVATE_METADATA;

const UUID = /^[0-9a-f-]{36}$/i;

export default async function CheckoutPage({ params }: PageProps<'/[locale]/checkout/[reservationId]'>) {
  const { locale, reservationId } = (await params) as { locale: AppLocale; reservationId: string };
  setRequestLocale(locale);
  await requireViewer(locale, `/checkout/${reservationId}`);
  const user = await getAuthUser();
  if (!user || !UUID.test(reservationId)) notFound();
  const ctx = getServerContext();

  let reservation: Awaited<ReturnType<typeof checkout.getReservation>>;
  try {
    reservation = await checkout.getReservation(ctx, user, reservationId);
  } catch (error) {
    if (toAppError(error).code === 'reservation_not_found') notFound();
    throw error;
  }
  const [{ data: order }, { data: event }] = await Promise.all([
    ctx.admin.from('orders').select('id, status').eq('reservation_id', reservation.id).eq('user_id', user.id).maybeSingle(),
    ctx.admin.from('events').select('country_code').eq('id', reservation.event.id).maybeSingle(),
  ]);
  if (order && ['paid', 'fulfilled'].includes(order.status)) redirect({ href: `/checkout/confirmation/${order.id}`, locale });

  const t = await getTranslations('checkout');
  return (
    <div className="container-page py-8">
      <PageHeader title={t('cart')} subtitle={t('orderSummaryFor', { event: reservation.event.title })} />
      <CheckoutFlow
        country={event?.country_code ?? null}
        existingOrder={order && order.status === 'pending_payment' ? order : null}
        reservation={{
          id: reservation.id,
          status: reservation.status,
          expiresAt: reservation.expiresAt,
          quantity: reservation.quantity,
          environment: reservation.environment,
          offerName: reservation.offer.name,
          event: { slug: reservation.event.slug, title: reservation.event.title, dateLabel: eventDateTime(reservation.event.startsAt, reservation.event.timezone, locale, event?.country_code, { withTimeZoneName: true }) },
          pricing: reservation.pricing,
        }}
      />
    </div>
  );
}

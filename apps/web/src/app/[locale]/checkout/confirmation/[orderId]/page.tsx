import { getMyOrder } from '@tamurt/api-client';
import { CircleCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';
import { eventDateTime, money } from '@/lib/format';
import { requireViewer } from '@/lib/guards';
import { PRIVATE_METADATA } from '@/lib/seo';
import { getSupabase } from '@/lib/session';

export const metadata: Metadata = PRIVATE_METADATA;

export default async function ConfirmationPage({ params }: PageProps<'/[locale]/checkout/confirmation/[orderId]'>) {
  const { locale, orderId } = (await params) as { locale: AppLocale; orderId: string };
  setRequestLocale(locale);
  await requireViewer(locale, `/checkout/confirmation/${orderId}`);
  const order = /^[0-9a-f-]{36}$/i.test(orderId) ? await getMyOrder(await getSupabase(), orderId) : null;
  if (!order) notFound();
  const t = await getTranslations();
  const confirmed = order.status === 'fulfilled' || order.status === 'paid';
  return (
    <div className="container-page flex justify-center py-12">
      <Card className="w-full max-w-xl space-y-5 p-8 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success"><CircleCheck className="h-9 w-9" aria-hidden /></span>
        <h1 className="font-display text-3xl font-extrabold">{confirmed ? t('checkout.confirmationTitle') : t(`orders.status.${order.status}` as 'orders.status.paid')}</h1>
        {confirmed ? <p className="text-muted">{t('checkout.confirmationText', { number: order.order_number })}</p> : null}
        <div className="rounded-lg bg-sunken p-4 text-start text-sm">
          <p className="font-semibold">{order.event.title}</p>
          <p className="text-muted">{eventDateTime(order.event.starts_at, order.event.timezone, locale, null, { withTimeZoneName: true })}</p>
          <p className="mt-2 flex justify-between font-semibold"><span>{t('common.total')}</span><span>{money(Number(order.total_minor), order.currency, locale)}</span></p>
        </div>
        {order.environment === 'demo' ? <Alert tone="demo" className="text-start">{t('tickets.demoSpecimenText')}</Alert> : null}
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/account/tickets" className={buttonClasses({ size: 'lg' })}>{t('checkout.viewTickets')}</Link>
          <Link href={`/events/${order.event.slug}`} className={buttonClasses({ variant: 'outline', size: 'lg' })}>{t('checkout.backToEvent')}</Link>
        </div>
      </Card>
    </div>
  );
}

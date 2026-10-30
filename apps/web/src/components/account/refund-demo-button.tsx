'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage, useApi } from '@/hooks/use-api';
import { useRouter } from '@/i18n/navigation';

/** Annulation + remboursement d'une commande FICTIVE (démonstration du parcours de remboursement). */
export function RefundDemoButton({ orderId }: { orderId: string }) {
  const t = useTranslations();
  const api = useApi();
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; message: string | null; ok: boolean }>({ busy: false, message: null, ok: false });
  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        loading={state.busy}
        onClick={async () => {
          setState({ busy: true, message: null, ok: false });
          try {
            await api.checkout.refundDemo(orderId);
            setState({ busy: false, message: t('orders.refundedDemo'), ok: true });
            router.refresh();
          } catch (caught) {
            setState({ busy: false, message: errorMessage(caught, t('common.unknownError')), ok: false });
          }
        }}
      >
        {t('orders.refundDemo')}
      </Button>
      {state.message ? <Alert tone={state.ok ? 'success' : 'danger'}>{state.message}</Alert> : null}
    </div>
  );
}

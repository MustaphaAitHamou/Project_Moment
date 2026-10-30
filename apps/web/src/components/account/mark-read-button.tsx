'use client';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { markNotificationsReadAction } from '@/lib/actions/account';

export function MarkReadButton({ ids, label }: { ids?: string[]; label?: string }) {
  const t = useTranslations('notifications');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button size="sm" variant={ids ? 'ghost' : 'outline'} loading={pending} onClick={() => startTransition(async () => { await markNotificationsReadAction(ids); router.refresh(); })}>
      {label ?? (ids ? t('markRead') : t('markAllRead'))}
    </Button>
  );
}

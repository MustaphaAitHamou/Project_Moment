'use client';
import { BellPlus, BellRing } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { followCityAction } from '@/lib/actions/account';

export function FollowCityButton({ cityId, initial, signedIn, returnTo }: { cityId: string; initial: boolean; signedIn: boolean; returnTo: string }) {
  const t = useTranslations('account');
  const [following, setFollowing] = useState(initial);
  const [pending, startTransition] = useTransition();
  if (!signedIn) {
    return <Link href={{ pathname: '/auth/login', query: { next: returnTo } }} className={buttonClasses({ variant: 'outline' })}><BellPlus className="h-4 w-4" aria-hidden />{t('followCity')}</Link>;
  }
  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={following}
      className={buttonClasses({ variant: following ? 'soft' : 'outline' })}
      onClick={() =>
        startTransition(async () => {
          const result = await followCityAction(cityId, !following);
          if (result.ok) setFollowing(!following);
        })
      }
    >
      {following ? <BellRing className="h-4 w-4" aria-hidden /> : <BellPlus className="h-4 w-4" aria-hidden />}
      {following ? t('unfollowCity') : t('followCity')}
    </button>
  );
}

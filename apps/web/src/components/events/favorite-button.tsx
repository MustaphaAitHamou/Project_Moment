'use client';
import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Link } from '@/i18n/navigation';
import { toggleFavoriteAction } from '@/lib/actions/events';
import { cn } from '@/lib/utils';

export function FavoriteButton({ eventId, initial, signedIn, returnTo, className }: { eventId: string; initial: boolean; signedIn: boolean; returnTo: string; className?: string }) {
  const t = useTranslations('event');
  const [favorite, setFavorite] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const classes = cn('inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors', favorite ? 'border-primary bg-primary-soft text-primary' : 'border-line-strong bg-surface hover:bg-sunken', className);

  if (!signedIn) {
    return (
      <Link href={{ pathname: '/auth/login', query: { next: returnTo } }} className={classes}>
        <Heart className="h-5 w-5" aria-hidden />
        {t('addFavorite')}
      </Link>
    );
  }
  return (
    <>
      <button
        type="button"
        className={classes}
        aria-pressed={favorite}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const next = !favorite;
            setFavorite(next);
            const result = await toggleFavoriteAction(eventId, next);
            if (result.ok) setMessage(next ? t('favoriteAdded') : t('favoriteRemoved'));
            else {
              setFavorite(!next);
              setMessage(result.message);
            }
          })
        }
      >
        <Heart className={cn('h-5 w-5', favorite && 'fill-current')} aria-hidden />
        {favorite ? t('removeFavorite') : t('addFavorite')}
      </button>
      <span className="sr-only" role="status">{message}</span>
    </>
  );
}

import Image from 'next/image';
import { cn } from '@/lib/utils';
import { posterUrl } from './event-data';

/**
 * Visuel d'un événement : image validée par la modération si elle existe, sinon affiche
 * générative propre à Tamurt (jamais de visuel de tiers).
 */
export function EventPoster({
  slug,
  category,
  coverUrl,
  alt,
  className,
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  priority,
  ratio = 'card',
}: {
  slug: string;
  category: string;
  coverUrl: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  ratio?: 'card' | 'wide';
}) {
  return (
    <div className={cn('relative overflow-hidden bg-sunken', className)}>
      {coverUrl ? (
        <Image src={coverUrl} alt={alt} fill sizes={sizes} className="object-cover" priority={priority} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- SVG généré localement, déjà optimisé
        <img src={posterUrl(slug, category, ratio)} alt="" className="absolute inset-0 h-full w-full object-cover" loading={priority ? 'eager' : 'lazy'} decoding="async" />
      )}
    </div>
  );
}

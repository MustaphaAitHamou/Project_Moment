import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyStageSpot } from '@/components/illustrations/night-scenes';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  illustrated = false,
  title,
  text,
  action,
  className,
}: {
  icon?: LucideIcon;
  /** Scène illustrée à la place de l'icône (états vides de découverte d'événements). */
  illustrated?: boolean;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center', className)}>
      {Icon && !illustrated ? (
        <span className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-7 w-7" aria-hidden />
        </span>
      ) : (
        // Sans icône dédiée : la scène vide qui attend son public.
        <EmptyStageSpot className="w-48" />
      )}
      <p className="font-display text-lg font-semibold">{title}</p>
      {text ? <p className="max-w-md text-sm text-muted">{text}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </div>
  );
}

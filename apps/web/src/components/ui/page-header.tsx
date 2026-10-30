import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({ title, subtitle, actions, eyebrow, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; className?: string }) {
  return (
    <header className={cn('flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <div className="text-sm font-semibold text-primary">{eyebrow}</div> : null}
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle ? <p className="max-w-2xl text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-4', className)}>
      <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
      {action ? <div className="shrink-0 text-sm">{action}</div> : null}
    </div>
  );
}

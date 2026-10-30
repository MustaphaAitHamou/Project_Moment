import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type Tone = 'neutral' | 'primary' | 'accent' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'demo';

const TONES: Record<Tone, string> = {
  neutral: 'bg-sunken text-muted',
  primary: 'bg-primary-soft text-primary',
  accent: 'bg-accent-soft text-warning',
  secondary: 'bg-secondary-soft text-secondary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  demo: 'bg-demo-soft text-demo',
};

export function Badge({ tone = 'neutral', className, children, title }: { tone?: Tone; className?: string; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5', TONES[tone], className)}>
      {children}
    </span>
  );
}

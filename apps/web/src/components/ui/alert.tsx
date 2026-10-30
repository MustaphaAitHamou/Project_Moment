import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AlertTone = 'info' | 'success' | 'warning' | 'danger' | 'demo';

const STYLES: Record<AlertTone, string> = {
  info: 'border-info/30 bg-info-soft text-fg',
  success: 'border-success/30 bg-success-soft text-fg',
  warning: 'border-warning/30 bg-warning-soft text-fg',
  danger: 'border-danger/30 bg-danger-soft text-fg',
  demo: 'border-demo/30 bg-demo-soft text-fg',
};

const ICONS = { info: Info, success: CircleCheck, warning: TriangleAlert, danger: CircleAlert, demo: Info };
const ICON_COLORS: Record<AlertTone, string> = { info: 'text-info', success: 'text-success', warning: 'text-warning', danger: 'text-danger', demo: 'text-demo' };

export function Alert({ tone = 'info', title, children, className, action }: { tone?: AlertTone; title?: ReactNode; children?: ReactNode; className?: string; action?: ReactNode }) {
  const Icon = ICONS[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-lg border p-4 text-sm', STYLES[tone], className)}>
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', ICON_COLORS[tone])} aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-muted">{children}</div> : null}
        {action ? <div className="pt-2">{action}</div> : null}
      </div>
    </div>
  );
}

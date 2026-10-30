import { logoMarkSvg } from '@tamurt/ui';
import { cn } from '@/lib/utils';

const MARK = logoMarkSvg({ size: 36 });

/** Logo Tamurt (SVG généré par @tamurt/ui, contenu interne de confiance). */
export function Logo({ className, withText = true, label }: { className?: string; withText?: boolean; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span aria-hidden className="h-9 w-9 shrink-0 [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: MARK }} />
      {withText ? (
        <span className="font-display text-lg font-extrabold leading-none tracking-tight">
          Tamurt<span className="text-primary"> Events</span>
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
}

import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Logo Tamurt Events (DA Tamurt Services) : le mot TAMURT rouge et sa ligne ⵜⴰⵎⵓⵔⵜ, puis « Events » en néon rose.
 * L'app est toujours de nuit : seule la version pour fond sombre est utilisée.
 */
export function Logo({ className, withText = true, label }: { className?: string; withText?: boolean; label: string }) {
  if (!withText) {
    return <Image src="/icon.svg" alt={label} width={36} height={36} unoptimized className={cn('h-9 w-9 shrink-0', className)} />;
  }
  return (
    <span className={cn('inline-flex items-center', className)}>
      <Image src="/brand/wordmark-sombre.svg" alt={label} width={114} height={30} unoptimized priority className="h-[30px] w-auto" />
    </span>
  );
}

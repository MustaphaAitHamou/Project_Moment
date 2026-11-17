import type { CountryCode } from '@tamurt/core';
import { cn } from '@/lib/utils';

/*
 * Drapeaux dessinés en SVG : les drapeaux en emoji ne s'affichent pas sous Windows
 * (on y voit « FR », « DZ »…). Simplifiés pour un affichage de 14 à 24 px ; sans id, donc
 * répétables sur une même page.
 */
function FlagShapes({ code }: { code: CountryCode }) {
  switch (code) {
    case 'FR':
      return (
        <>
          <rect width="10" height="20" fill="#0055A4" />
          <rect x="10" width="10" height="20" fill="#FFFFFF" />
          <rect x="20" width="10" height="20" fill="#EF4135" />
        </>
      );
    case 'DZ':
      return (
        <>
          <rect width="15" height="20" fill="#006233" />
          <rect x="15" width="15" height="20" fill="#FFFFFF" />
          {/* Croissant : arc extérieur (r 5) et arc intérieur (r 4) entre leurs deux intersections. */}
          <path d="M18.85 7.53A5 5 0 1 0 18.85 12.47A4 4 0 1 1 18.85 7.53Z" fill="#D21034" />
          <path d="M16.1 10 18.05 9.37 18.05 7.32 19.26 8.97 21.21 8.34 20.01 10 21.21 11.66 19.26 11.03 18.05 12.68 18.05 10.63Z" fill="#D21034" />
        </>
      );
    case 'US':
      return (
        <>
          <rect width="30" height="20" fill="#FFFFFF" />
          {[0, 2, 4, 6, 8, 10, 12].map((i) => (
            <rect key={i} y={(i * 20) / 13} width="30" height={20 / 13} fill="#B22234" />
          ))}
          <rect width="12" height={(7 * 20) / 13} fill="#3C3B6E" />
          {[1.6, 4.4, 7.2, 10].map((x) => [1.7, 4.3, 6.9, 9.5].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.55" fill="#FFFFFF" />))}
        </>
      );
    case 'CA':
      return (
        <>
          <rect width="30" height="20" fill="#FFFFFF" />
          <rect width="7.5" height="20" fill="#D52B1E" />
          <rect x="22.5" width="7.5" height="20" fill="#D52B1E" />
          <path
            transform="translate(8 2.72) scale(1.4)"
            d="M5 .6 5.8 2.2 6.9 1.8 6.5 4.4 8.2 3.2 8.6 4.2 9.8 4 8.9 5.6 9.4 6 7 7.6 7.3 8.3 5.25 8 5.3 9.8 4.7 9.8 4.75 8 2.7 8.3 3 7.6 .6 6 1.1 5.6.2 4 1.4 4.2 1.8 3.2 3.5 4.4 3.1 1.8 4.2 2.2Z"
            fill="#D52B1E"
          />
        </>
      );
    default:
      return <rect width="30" height="20" fill="currentColor" opacity="0.2" />;
  }
}

export function CountryFlag({ code, className }: { code: CountryCode; className?: string }) {
  return (
    // cn() est un simple clsx : la taille par défaut ne s'applique que si l'appelant n'en donne pas.
    <svg viewBox="0 0 30 20" aria-hidden className={cn('inline-block shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/15', className ?? 'h-3.5 w-[21px]')}>
      <FlagShapes code={code} />
    </svg>
  );
}

/** « Tous les pays » : un petit globe néon (même gabarit que les drapeaux). */
export function GlobeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={cn('inline-block h-4 w-4 shrink-0', className)}>
      <circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <ellipse cx="10" cy="10" rx="3.6" ry="8.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2 7.2h16M2 12.8h16" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

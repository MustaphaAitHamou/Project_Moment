import { cn } from '@/lib/utils';

/*
 * Illustrations originales de Tamurt Events (DA « nuit et néons ») : rose néon #FF4FA3,
 * cyan #2FE6F0, violet #6D2EE8 sur la nuit #140A2E. Purement décoratives (aria-hidden).
 * Les animations (classes ev-*) s'arrêtent si l'utilisateur limite les mouvements.
 */

const PINK = '#FF4FA3';
const CYAN = '#2FE6F0';
const VIOLET = '#6D2EE8';
const NIGHT = '#0B0520';
const INK = '#140A2E';

function Sparkle({ x, y, size, color = '#FFFFFF', delay = 0 }: { x: number; y: number; size: number; color?: string; delay?: number }) {
  const s = size;
  const k = s * 0.2;
  return (
    <path
      className="ev-twinkle"
      style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}
      d={`M${x} ${y - s}C${x + k} ${y - k} ${x + k} ${y - k} ${x + s} ${y}C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + s}C${x - k} ${y + k} ${x - k} ${y + k} ${x - s} ${y}C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - s}Z`}
      fill={color}
    />
  );
}

function Note({ x, y, color, delay = 0 }: { x: number; y: number; color: string; delay?: number }) {
  return (
    <g className="ev-float" style={{ animationDelay: `${delay}s` }}>
      <path d={`M${x} ${y}v-22l14-4v22`} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={x - 4} cy={y} rx="5" ry="4" fill={color} />
      <ellipse cx={x + 10} cy={y - 4} rx="5" ry="4" fill={color} />
    </g>
  );
}

/**
 * Bandeau d'accueil : une scène de concert « synthwave » — soleil rayé, faisceaux de
 * projecteurs, égaliseur, public en ombres chinoises avec téléphones allumés, un billet
 * et une route de concerts entre les quatre pays. Utilisée une fois par page (ids fixes).
 */
export function NightStageIllustration({ className }: { className?: string }) {
  const bars = [26, 44, 62, 36, 78, 52, 30, 58, 40];
  return (
    <svg viewBox="0 0 560 460" aria-hidden className={cn('h-auto w-full', className)}>
      <defs>
        <linearGradient id="ev-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PINK} />
          <stop offset="1" stopColor={VIOLET} />
        </linearGradient>
        <radialGradient id="ev-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={PINK} stopOpacity="0.45" />
          <stop offset="1" stopColor={PINK} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ev-beam-cyan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={CYAN} stopOpacity="0.55" />
          <stop offset="1" stopColor={CYAN} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ev-beam-pink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PINK} stopOpacity="0.5" />
          <stop offset="1" stopColor={PINK} stopOpacity="0" />
        </linearGradient>
        <clipPath id="ev-sun-cut">
          {/* Bandes horizontales de plus en plus fines vers le bas : le soleil « tranché ». */}
          <rect x="150" y="60" width="300" height="150" />
          <rect x="150" y="214" width="300" height="16" />
          <rect x="150" y="236" width="300" height="12" />
          <rect x="150" y="254" width="300" height="9" />
          <rect x="150" y="269" width="300" height="6" />
        </clipPath>
        {/* Le public se fond dans la nuit sur les bords (pas de coupure nette). */}
        <linearGradient id="ev-fade-x" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.12" stopColor="#FFF" />
          <stop offset="0.88" stopColor="#FFF" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id="ev-crowd-mask">
          <rect x="0" y="300" width="560" height="160" fill="url(#ev-fade-x)" />
        </mask>
        <filter id="ev-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Halo et soleil rayé */}
      <circle cx="300" cy="190" r="200" fill="url(#ev-halo)" />
      <circle cx="300" cy="185" r="112" fill="url(#ev-sun)" clipPath="url(#ev-sun-cut)" />

      {/* Faisceaux de projecteurs, qui balaient doucement la scène */}
      <g className="ev-beam" style={{ transformOrigin: '70px 0px' }}>
        <path d="M60 0 78 0 330 330 190 330Z" fill="url(#ev-beam-cyan)" />
      </g>
      <g className="ev-beam ev-beam-reverse" style={{ transformOrigin: '500px 0px' }}>
        <path d="M490 0 508 0 400 330 250 330Z" fill="url(#ev-beam-pink)" />
      </g>
      <rect x="54" y="0" width="30" height="14" rx="3" fill={CYAN} filter="url(#ev-glow)" />
      <rect x="484" y="0" width="30" height="14" rx="3" fill={PINK} filter="url(#ev-glow)" />

      {/* Sol de scène en perspective */}
      <path d="M120 330H480L560 400H40Z" fill="#1E0F45" mask="url(#ev-crowd-mask)" />
      <g stroke={CYAN} strokeOpacity="0.45" strokeWidth="1.2">
        <path d="M95 352H505M70 374H530M48 394H552" />
        <path d="M300 330V400M240 330 200 400M360 330 400 400M180 330 100 400M420 330 500 400" />
      </g>
      <path d="M120 330H480" stroke={PINK} strokeWidth="3" filter="url(#ev-glow)" />

      {/* Égaliseur au centre de la scène */}
      <g fill={CYAN} filter="url(#ev-glow)">
        {bars.map((h, i) => (
          <rect
            key={i}
            className="ev-eq"
            style={{ animationDelay: `${(i % 5) * 0.18}s`, transformOrigin: `${214 + i * 20}px 324px` }}
            x={208 + i * 20}
            y={324 - h}
            width="12"
            height={h}
            rx="3"
          />
        ))}
      </g>

      {/* Route de concerts entre les quatre pays */}
      <path d="M36 170C90 110 150 98 196 120" fill="none" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" className="ev-dash" />
      {[
        [36, 170, PINK],
        [92, 122, CYAN],
        [146, 104, '#FFFFFF'],
        [196, 120, PINK],
      ].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M0 0C-6-7-8-10-8-14a8 8 0 1 1 16 0c0 4-2 7-8 14Z" fill={c as string} />
          <circle cy="-14" r="3" fill={INK} />
        </g>
      ))}

      {/* Billet qui flotte */}
      <g className="ev-float-slow">
        <g transform="translate(420 60) rotate(12)">
          <path d="M0 6a6 6 0 0 1 6-6h96a6 6 0 0 1 6 6v20a9 9 0 0 0 0 18v20a6 6 0 0 1-6 6H6a6 6 0 0 1-6-6V44a9 9 0 0 0 0-18Z" fill="#FFFFFF" />
          <path d="M76 4v62" stroke={PINK} strokeWidth="2" strokeDasharray="4 4" />
          <rect x="12" y="14" width="52" height="8" rx="2" fill={INK} />
          <rect x="12" y="28" width="38" height="6" rx="2" fill={VIOLET} opacity="0.6" />
          <g fill={INK}>
            {[0, 4, 6, 10, 13, 15, 19].map((x) => (
              <rect key={x} x={12 + x * 2} y="44" width={x % 2 ? 2 : 3} height="14" />
            ))}
          </g>
          <path d="M92 26l3 6 6 1-4.5 4.2 1 6.3L92 40.6l-5.5 2.9 1-6.3L83 33l6-1Z" fill={PINK} />
        </g>
      </g>

      {/* Notes de musique et étincelles */}
      <Note x={110} y={300} color={PINK} />
      <Note x={470} y={250} color={CYAN} delay={1.2} />
      <Sparkle x={250} y={40} size={9} color={CYAN} />
      <Sparkle x={380} y={30} size={6} delay={0.8} />
      <Sparkle x={150} y={60} size={7} color={PINK} delay={1.6} />
      <Sparkle x={530} y={190} size={8} delay={0.4} />
      <Sparkle x={30} y={260} size={6} color={CYAN} delay={2} />

      {/* Public en ombres chinoises, téléphones allumés */}
      <g mask="url(#ev-crowd-mask)">
      <g fill={NIGHT}>
        <path d="M0 460V430c20-18 40-24 62-24s38 8 52 22c14-16 34-26 58-26s46 10 60 26c14-14 34-22 56-22s40 8 54 22c16-16 36-26 60-26s44 10 58 26c12-12 30-20 50-20s40 8 50 18v34Z" />
        <circle cx="62" cy="392" r="20" />
        <circle cx="172" cy="384" r="22" />
        <circle cx="288" cy="390" r="19" />
        <circle cx="402" cy="382" r="22" />
        <circle cx="510" cy="394" r="18" />
        <path d="M140 400 118 336" stroke={NIGHT} strokeWidth="11" strokeLinecap="round" />
        <path d="M430 398 456 330" stroke={NIGHT} strokeWidth="11" strokeLinecap="round" />
        <path d="M262 404 250 352" stroke={NIGHT} strokeWidth="10" strokeLinecap="round" />
      </g>
      <g className="ev-twinkle" style={{ animationDelay: '0.6s' }}>
        <rect x="109" y="318" width="16" height="24" rx="3" fill="#FFFFFF" />
        <circle cx="117" cy="322" r="2" fill={CYAN} />
      </g>
      <g className="ev-twinkle" style={{ animationDelay: '1.4s' }}>
        <rect x="449" y="312" width="16" height="24" rx="3" fill="#FFFFFF" />
        <circle cx="457" cy="316" r="2" fill={PINK} />
      </g>
      <circle cx="250" cy="346" r="5" fill={CYAN} className="ev-twinkle" filter="url(#ev-glow)" />
      </g>
    </svg>
  );
}

/** « Vous organisez un événement ? » : mégaphone, calendrier et billet sur le dégradé de marque. */
export function OrganizerSpot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 170" aria-hidden className={cn('h-auto', className)}>
      <g className="ev-float-slow">
        <rect x="112" y="20" width="84" height="84" rx="10" fill="#FFFFFF" />
        <rect x="112" y="20" width="84" height="22" rx="10" fill={CYAN} />
        <rect x="112" y="32" width="84" height="10" fill={CYAN} />
        <path d="M132 14v14M176 14v14" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" />
        <g fill={VIOLET} opacity="0.35">
          {[0, 1, 2, 3].map((c) => [0, 1].map((r) => <rect key={`${c}-${r}`} x={124 + c * 17} y={52 + r * 17} width="10" height="10" rx="2" />))}
        </g>
        <circle cx="175" cy="86" r="13" fill={PINK} />
        <path d="M175 80v12M169 86h12" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      </g>
      <g transform="translate(18 66) rotate(-14)">
        <path d="M0 22h18l52-22v74L18 52H0Z" fill="#FFFFFF" />
        <rect x="4" y="52" width="16" height="30" rx="5" fill="#FFFFFF" opacity="0.85" />
        <path d="M80 18c10 6 10 32 0 38M90 8c18 12 18 46 0 58" fill="none" stroke={CYAN} strokeWidth="4" strokeLinecap="round" className="ev-twinkle" />
      </g>
      <Sparkle x={200} y={128} size={9} color={CYAN} />
      <Sparkle x={96} y={22} size={6} delay={1} />
    </svg>
  );
}

/** « Rejoignez Tamurt Beta » : un téléphone et l'application en avant-première. */
export function BetaSpot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 170" aria-hidden className={cn('h-auto', className)}>
      <g className="ev-float">
        <rect x="62" y="10" width="76" height="146" rx="14" fill={INK} stroke={CYAN} strokeWidth="3" />
        <rect x="88" y="18" width="24" height="5" rx="2.5" fill={CYAN} opacity="0.6" />
        <rect x="72" y="32" width="56" height="40" rx="6" fill={VIOLET} />
        <circle cx="114" cy="46" r="10" fill={PINK} />
        <path d="M72 72l18-16 14 12 10-8 14 12" fill="none" stroke={CYAN} strokeWidth="2.5" strokeLinejoin="round" />
        <rect x="72" y="80" width="40" height="6" rx="3" fill="#FFFFFF" />
        <rect x="72" y="92" width="56" height="5" rx="2.5" fill="#FFFFFF" opacity="0.4" />
        <rect x="72" y="103" width="48" height="5" rx="2.5" fill="#FFFFFF" opacity="0.4" />
        <rect x="72" y="120" width="56" height="20" rx="10" fill={PINK} />
      </g>
      <Sparkle x={40} y={40} size={10} color={PINK} />
      <Sparkle x={164} y={30} size={7} color={CYAN} delay={0.7} />
      <Sparkle x={160} y={130} size={8} delay={1.4} />
      <Sparkle x={34} y={128} size={6} color={CYAN} delay={2.1} />
    </svg>
  );
}

/** État vide : une scène qui attend son public (projecteur allumé, micro, rideaux). */
export function EmptyStageSpot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 160" aria-hidden className={cn('h-auto', className)}>
      <path d="M120 0 150 0 200 130H70Z" fill={CYAN} opacity="0.12" />
      <path d="M0 0h52c-6 40-6 90 6 136H0Z" fill={PINK} opacity="0.85" />
      <path d="M240 0h-52c6 40 6 90-6 136h58Z" fill={PINK} opacity="0.85" />
      <path d="M22 0c-2 40 0 90 8 136M218 0c2 40 0 90-8 136" stroke={INK} strokeOpacity="0.35" strokeWidth="3" fill="none" />
      <path d="M30 136h180l20 24H10Z" fill="#2A1850" />
      <path d="M30 136h180" stroke={CYAN} strokeWidth="2" />
      <g stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M120 132V82" />
        <path d="M106 132h28" />
      </g>
      <rect x="112" y="62" width="16" height="24" rx="8" fill="#FFFFFF" />
      <ellipse cx="120" cy="134" rx="46" ry="5" fill={CYAN} opacity="0.25" />
      <Sparkle x={86} y={40} size={6} color={CYAN} />
      <Sparkle x={160} y={56} size={5} delay={1.2} />
    </svg>
  );
}

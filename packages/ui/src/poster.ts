import { categoryVisual, mixHex } from './categories';
import { palette } from './tokens';

/**
 * Affiches génératives : visuel abstrait et déterministe (même graine = même affiche) utilisé
 * lorsqu'un événement n'a pas d'image approuvée — en particulier pour les événements fictifs
 * de démonstration, afin de n'utiliser aucune photo d'artiste ou de lieu réel.
 * Le SVG produit est rendu tel quel sur le web et via react-native-svg sur mobile.
 */

export interface PosterOptions {
  seed: string;
  category: string;
  width?: number;
  height?: number;
}

export interface PosterSpec {
  width: number;
  height: number;
  background: [string, string];
  accent: string;
  shapes: PosterShape[];
}

export type PosterShape =
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: string; opacity: number }
  | { kind: 'ring'; cx: number; cy: number; r: number; stroke: string; width: number; opacity: number }
  | { kind: 'diamond'; cx: number; cy: number; size: number; fill: string; opacity: number; rotate: number }
  | { kind: 'stripes'; y: number; count: number; gap: number; stroke: string; width: number; opacity: number; angle: number }
  | { kind: 'arc'; cx: number; cy: number; r: number; stroke: string; width: number; opacity: number; start: number; sweep: number };

/** Hachage FNV-1a 32 bits (stable sur toutes les plateformes). */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPosterSpec({ seed, category, width = 800, height = 1000 }: PosterOptions): PosterSpec {
  const random = mulberry32(hashString(`${category}:${seed}`));
  const base = categoryVisual(category).color;
  const accents = [palette.saffron[400], palette.ember[400], palette.night[300], '#FFFFFF'];
  const accent = accents[Math.floor(random() * accents.length)] ?? palette.saffron[400];
  const background: [string, string] = [mixHex(base, palette.night[900], 0.15 + random() * 0.2), mixHex(base, palette.night[950], 0.75)];
  const shapes: PosterShape[] = [];
  const layout = Math.floor(random() * 4);
  const min = Math.min(width, height);

  if (layout === 0) {
    // Soleil et anneaux concentriques
    const cx = width * (0.3 + random() * 0.4);
    const cy = height * (0.25 + random() * 0.2);
    shapes.push({ kind: 'circle', cx, cy, r: min * (0.22 + random() * 0.1), fill: accent, opacity: 0.9 });
    for (let i = 1; i <= 4; i += 1) {
      shapes.push({ kind: 'ring', cx, cy, r: min * (0.3 + i * 0.09), stroke: accent, width: 2 + random() * 3, opacity: 0.5 - i * 0.08 });
    }
  } else if (layout === 1) {
    // Losanges imbriqués (motif signature)
    const cx = width / 2;
    const cy = height * (0.38 + random() * 0.1);
    for (let i = 0; i < 4; i += 1) {
      shapes.push({
        kind: 'diamond',
        cx,
        cy,
        size: min * (0.7 - i * 0.15),
        fill: i % 2 === 0 ? accent : mixHex(base, '#FFFFFF', 0.15),
        opacity: 0.25 + i * 0.18,
        rotate: 0,
      });
    }
  } else if (layout === 2) {
    // Bandes diagonales + disque
    shapes.push({
      kind: 'stripes',
      y: height * 0.1,
      count: 9 + Math.floor(random() * 6),
      gap: 26 + random() * 20,
      stroke: accent,
      width: 6 + random() * 8,
      opacity: 0.35,
      angle: -20 - random() * 25,
    });
    shapes.push({ kind: 'circle', cx: width * (0.65 + random() * 0.15), cy: height * 0.3, r: min * 0.18, fill: mixHex(accent, '#FFFFFF', 0.1), opacity: 0.95 });
  } else {
    // Arcs de scène
    const cx = width / 2;
    const cy = height * 0.95;
    for (let i = 0; i < 6; i += 1) {
      shapes.push({
        kind: 'arc',
        cx,
        cy,
        r: min * (0.35 + i * 0.12),
        stroke: i % 2 === 0 ? accent : '#FFFFFF',
        width: 10 + random() * 14,
        opacity: 0.75 - i * 0.1,
        start: 180,
        sweep: 180,
      });
    }
  }
  // Petits losanges décoratifs
  const sparkles = 3 + Math.floor(random() * 4);
  for (let i = 0; i < sparkles; i += 1) {
    shapes.push({
      kind: 'diamond',
      cx: width * random(),
      cy: height * (0.05 + random() * 0.55),
      size: 10 + random() * 26,
      fill: '#FFFFFF',
      opacity: 0.35 + random() * 0.4,
      rotate: 0,
    });
  }
  return { width, height, background, accent, shapes };
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

function shapeToSvg(shape: PosterShape, spec: PosterSpec): string {
  switch (shape.kind) {
    case 'circle':
      return `<circle cx="${fmt(shape.cx)}" cy="${fmt(shape.cy)}" r="${fmt(shape.r)}" fill="${shape.fill}" fill-opacity="${fmt(shape.opacity)}"/>`;
    case 'ring':
      return `<circle cx="${fmt(shape.cx)}" cy="${fmt(shape.cy)}" r="${fmt(shape.r)}" fill="none" stroke="${shape.stroke}" stroke-width="${fmt(shape.width)}" stroke-opacity="${fmt(Math.max(shape.opacity, 0.05))}"/>`;
    case 'diamond': {
      const h = shape.size / 2;
      const points = [
        [shape.cx, shape.cy - h],
        [shape.cx + h * 0.72, shape.cy],
        [shape.cx, shape.cy + h],
        [shape.cx - h * 0.72, shape.cy],
      ]
        .map(([x, y]) => `${fmt(x ?? 0)},${fmt(y ?? 0)}`)
        .join(' ');
      return `<polygon points="${points}" fill="${shape.fill}" fill-opacity="${fmt(shape.opacity)}"/>`;
    }
    case 'stripes': {
      const lines: string[] = [];
      for (let i = 0; i < shape.count; i += 1) {
        const y = shape.y + i * shape.gap;
        lines.push(`<line x1="-200" y1="${fmt(y)}" x2="${fmt(spec.width + 200)}" y2="${fmt(y)}"/>`);
      }
      return `<g stroke="${shape.stroke}" stroke-width="${fmt(shape.width)}" stroke-opacity="${fmt(shape.opacity)}" transform="rotate(${fmt(shape.angle)} ${fmt(spec.width / 2)} ${fmt(spec.height / 2)})">${lines.join('')}</g>`;
    }
    case 'arc': {
      const start = (shape.start * Math.PI) / 180;
      const end = ((shape.start + shape.sweep) * Math.PI) / 180;
      const x1 = shape.cx + shape.r * Math.cos(start);
      const y1 = shape.cy + shape.r * Math.sin(start);
      const x2 = shape.cx + shape.r * Math.cos(end);
      const y2 = shape.cy + shape.r * Math.sin(end);
      const large = shape.sweep > 180 ? 1 : 0;
      return `<path d="M ${fmt(x1)} ${fmt(y1)} A ${fmt(shape.r)} ${fmt(shape.r)} 0 ${large} 1 ${fmt(x2)} ${fmt(y2)}" fill="none" stroke="${shape.stroke}" stroke-width="${fmt(shape.width)}" stroke-opacity="${fmt(Math.max(shape.opacity, 0.05))}" stroke-linecap="round"/>`;
    }
    default:
      return '';
  }
}

export function posterToSvg(spec: PosterSpec): string {
  const id = `g${hashString(spec.background.join('') + spec.accent).toString(36)}`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${spec.width} ${spec.height}" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">`,
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${spec.background[0]}"/><stop offset="1" stop-color="${spec.background[1]}"/></linearGradient></defs>`,
    `<rect width="${spec.width}" height="${spec.height}" fill="url(#${id})"/>`,
    ...spec.shapes.map((shape) => shapeToSvg(shape, spec)),
    `<rect width="${spec.width}" height="${spec.height}" fill="${palette.night[950]}" fill-opacity="0.12"/>`,
    '</svg>',
  ].join('');
}

export function generatePosterSvg(options: PosterOptions): string {
  return posterToSvg(createPosterSpec(options));
}

/** Data URL utilisable dans <img src> ou Image (web) sans requête réseau. */
export function posterDataUrl(options: PosterOptions): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(generatePosterSvg(options))}`;
}

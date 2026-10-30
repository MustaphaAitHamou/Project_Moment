/**
 * Identité visuelle des catégories. Les icônes sont des noms génériques traduits par chaque
 * plateforme (lucide-react sur le web, @expo/vector-icons sur mobile) : aucun logo de tiers.
 */
export const CATEGORY_VISUALS = {
  concerts: { color: '#FF5B2E', icon: 'music' },
  festivals: { color: '#F59E0B', icon: 'festival' },
  shows: { color: '#E11D74', icon: 'sparkles' },
  theatre: { color: '#7C3AED', icon: 'theater' },
  comedy: { color: '#EAB308', icon: 'laugh' },
  conferences: { color: '#2563EB', icon: 'mic' },
  fairs: { color: '#0891B2', icon: 'store' },
  exhibitions: { color: '#0D9488', icon: 'frame' },
  sports: { color: '#16A34A', icon: 'trophy' },
  community: { color: '#65A30D', icon: 'hands' },
  culture: { color: '#C2410C', icon: 'landmark' },
  family: { color: '#DB2777', icon: 'family' },
  other: { color: '#64748B', icon: 'calendar' },
} as const;

export type CategoryIcon = (typeof CATEGORY_VISUALS)[keyof typeof CATEGORY_VISUALS]['icon'];

export function categoryVisual(slug: string): { color: string; icon: CategoryIcon } {
  return (CATEGORY_VISUALS as Record<string, { color: string; icon: CategoryIcon }>)[slug] ?? CATEGORY_VISUALS.other;
}

/** Mélange une couleur hexadécimale avec une autre (0 = a, 1 = b). */
export function mixHex(a: string, b: string, amount: number): string {
  const parse = (hex: string) => {
    const value = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  };
  const ca = parse(a);
  const cb = parse(b);
  const t = Math.min(Math.max(amount, 0), 1);
  return `#${ca
    .map((c, i) => Math.round(c + ((cb[i] ?? 0) - c) * t).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/** Couleur de texte lisible (contraste WCAG) sur un fond donné. */
export function readableTextColor(background: string): '#FFFFFF' | '#14112B' {
  const value = background.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  return luminance > 0.4 ? '#14112B' : '#FFFFFF';
}

export function contrastRatio(foreground: string, background: string): number {
  const lum = (hex: string) => {
    const value = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => {
      const c = parseInt(value.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  };
  const [l1, l2] = [lum(foreground), lum(background)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

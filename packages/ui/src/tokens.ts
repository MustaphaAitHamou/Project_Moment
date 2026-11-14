/**
 * Design tokens Tamurt Events — source unique pour le web (variables CSS générées) et le mobile.
 *
 * Identité (DA Tamurt Services) : la nuit et les néons d'une ville en fête. Nuit violette, rose néon,
 * cyan électrique ; mêmes fonds dans les deux thèmes, comme une salle de concert.
 * Kaushan Script pour les grands titres (l'enseigne lumineuse), Tilt Neon pour l'interface.
 * Pour changer d'identité, modifiez ce fichier puis lancez `pnpm --filter @tamurt/ui build:css`.
 */

export const palette = {
  /** Nuit et néons de la DA Tamurt Services. */
  neon: {
    pink: '#FF4FA3',
    pinkText: '#FF7AC0',
    pinkVif: '#F23D96',
    pinkSoft: '#3A0F3D',
    onPink: '#2A0420',
    cyan: '#2FE6F0',
    cyanSoft: '#0B2A3A',
    violet: '#8B3DFF',
    violetText: '#B48CFF',
    violetFill: '#6D2EE8',
    violetSoft: '#2A1A5C',
    deep: '#5B21D6',
    night: '#140A2E',
    nightRaised: '#21123F',
    nightHigh: '#2A1850',
    nightSunken: '#0B0520',
    line: '#3B2866',
    lineStrong: '#9482D6',
    ink: '#F7F1FF',
    inkMuted: '#C1B4E4',
    inkSubtle: '#A89BD0',
  },
  ember: {
    50: '#FFF1EC',
    100: '#FFDFD3',
    200: '#FFBBA5',
    300: '#FF9472',
    400: '#FF7449',
    500: '#FF5B2E',
    600: '#E8401A',
    700: '#C02F11',
    800: '#962612',
    900: '#6E1E11',
  },
  night: {
    50: '#F2F0FA',
    100: '#E3DFF3',
    200: '#C4BCE5',
    300: '#9C90D0',
    400: '#7464B6',
    500: '#53459A',
    600: '#3D3278',
    700: '#2C2459',
    800: '#1E1940',
    900: '#14112B',
    950: '#0C0A1A',
  },
  saffron: {
    50: '#FFF9E6',
    100: '#FFF0BF',
    200: '#FFE38A',
    300: '#FFD254',
    400: '#FFC233',
    500: '#F2A90C',
    600: '#C98406',
    700: '#9C6208',
    800: '#7A4C0E',
    900: '#5C390F',
  },
  sand: {
    50: '#FCFAF7',
    100: '#F7F3EE',
    200: '#EEE7DE',
    300: '#E0D6C9',
    400: '#C7B9A7',
    500: '#A39380',
    600: '#7F705F',
    700: '#5E5246',
    800: '#3F3730',
    900: '#25201C',
  },
  success: { light: '#12A15E', dark: '#3DD68C' },
  warning: { light: '#B97A00', dark: '#F5B83D' },
  danger: { light: '#D93036', dark: '#FF6B70' },
  info: { light: '#2F6FD8', dark: '#6FA8FF' },
  white: '#FFFFFF',
  black: '#000000',
} as const;

export interface SemanticColors {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textOnPrimary: string;
  textOnDanger: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  secondary: string;
  secondarySoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  focusRing: string;
  overlay: string;
  demo: string;
  demoSoft: string;
  skeleton: string;
}

/** App de nuit : les deux thèmes partagent les mêmes fonds et les mêmes néons (contrastes ≥ 4,5:1). */
const night: SemanticColors = {
  background: palette.neon.night,
  surface: palette.neon.nightRaised,
  surfaceRaised: palette.neon.nightHigh,
  surfaceSunken: palette.neon.nightSunken,
  border: palette.neon.line,
  borderStrong: palette.neon.lineStrong,
  text: palette.neon.ink,
  textMuted: palette.neon.inkMuted,
  textSubtle: palette.neon.inkSubtle,
  textOnPrimary: palette.neon.onPink,
  textOnDanger: '#3D1512',
  primary: palette.neon.pink,
  primaryHover: '#E84894',
  primarySoft: palette.neon.pinkSoft,
  accent: palette.neon.cyan,
  accentSoft: palette.neon.cyanSoft,
  secondary: palette.neon.violetFill,
  secondarySoft: palette.neon.violetSoft,
  success: '#5FD3BB',
  successSoft: '#0A2A24',
  warning: '#F8BA3C',
  warningSoft: '#382805',
  danger: '#FF8F85',
  dangerSoft: '#3D1512',
  info: '#8FB6F5',
  infoSoft: '#122444',
  focusRing: palette.neon.ink,
  overlay: 'rgba(11, 5, 32, 0.72)',
  demo: '#F8BA3C',
  demoSoft: '#382805',
  skeleton: palette.neon.nightHigh,
};

export const themes: { light: SemanticColors; dark: SemanticColors } = { light: night, dark: night };

export type ThemeName = keyof typeof themes;

export const typography = {
  fontFamily: {
    /** Enseigne lumineuse : grands titres et moments forts uniquement. */
    moment: 'Kaushan Script',
    display: 'Tilt Neon',
    body: 'Tilt Neon',
    arabic: 'IBM Plex Sans Arabic',
    mono: 'JetBrains Mono',
  },
  size: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
    '6xl': 60,
  },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700', extrabold: '800' },
  lineHeight: { tight: 1.1, snug: 1.25, normal: 1.5, relaxed: 1.65 },
  letterSpacing: { tight: -0.02, normal: 0, wide: 0.04 },
} as const;

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

/** Coins de la DA Events : pilules pour boutons, champs et puces ; cartes à 18 px. */
export const radii = { xs: 6, sm: 8, md: 12, lg: 18, xl: 24, '2xl': 32, full: 9999 } as const;

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px rgba(0, 0, 0, 0.35), 0 2px 4px rgba(0, 0, 0, 0.25)',
  lg: '0 12px 32px rgba(0, 0, 0, 0.45), 0 4px 8px rgba(0, 0, 0, 0.3)',
  /** Halo néon du bouton principal. */
  glow: '0 0 18px rgba(255, 79, 163, 0.55)',
  glowCyan: '0 0 14px rgba(47, 230, 240, 0.35)',
} as const;

/** Élévations React Native (iOS shadow* / Android elevation). */
export const elevation = {
  sm: { shadowColor: palette.night[900], shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowColor: palette.night[900], shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  lg: { shadowColor: palette.night[900], shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
} as const;

export const motion = {
  duration: { instant: 80, fast: 140, base: 220, slow: 360 },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;

export const breakpoints = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 } as const;

export const layout = {
  maxContentWidth: 1200,
  /** Hauteur minimale des cibles tactiles (accessibilité). */
  minTouchTarget: 44,
  tabBarHeight: 64,
} as const;

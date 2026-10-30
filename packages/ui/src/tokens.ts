/**
 * Design tokens Tamurt Events — source unique pour le web (variables CSS générées) et le mobile.
 *
 * Identité : « Braise » (énergie, scène), « Nuit » (soirées, élégance), « Safran » (chaleur, fête),
 * sur un fond « Sable » chaleureux en thème clair. Le motif signature est le losange, forme
 * géométrique universelle déclinée dans le logo et les affiches génératives.
 * Pour changer d'identité, modifiez ce fichier puis lancez `pnpm --filter @tamurt/ui build:css`.
 */

export const palette = {
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

export const themes: { light: SemanticColors; dark: SemanticColors } = {
  light: {
    background: palette.sand[100],
    surface: palette.white,
    surfaceRaised: palette.white,
    surfaceSunken: palette.sand[200],
    border: palette.sand[300],
    borderStrong: palette.sand[400],
    text: palette.night[900],
    textMuted: '#5A556F',
    textSubtle: '#7C7790',
    textOnPrimary: palette.white,
    primary: palette.ember[600],
    primaryHover: palette.ember[700],
    primarySoft: palette.ember[50],
    accent: palette.saffron[400],
    accentSoft: palette.saffron[50],
    secondary: palette.night[600],
    secondarySoft: palette.night[50],
    success: palette.success.light,
    successSoft: '#E6F6EE',
    warning: palette.warning.light,
    warningSoft: '#FFF4DA',
    danger: palette.danger.light,
    dangerSoft: '#FDE8E8',
    info: palette.info.light,
    infoSoft: '#E7F0FD',
    focusRing: palette.ember[500],
    overlay: 'rgba(20, 17, 43, 0.55)',
    demo: '#7A4C0E',
    demoSoft: palette.saffron[100],
    skeleton: palette.sand[200],
  },
  dark: {
    background: palette.night[950],
    surface: '#16132A',
    surfaceRaised: '#1E1A36',
    surfaceSunken: '#100E20',
    border: '#2C2748',
    borderStrong: '#3D3760',
    text: '#F4F1FF',
    textMuted: '#B3ADCB',
    textSubtle: '#8D86A8',
    textOnPrimary: palette.white,
    primary: palette.ember[500],
    primaryHover: palette.ember[400],
    primarySoft: '#3A1A12',
    accent: palette.saffron[400],
    accentSoft: '#3A2C0C',
    secondary: palette.night[300],
    secondarySoft: '#25204A',
    success: palette.success.dark,
    successSoft: '#0E2E20',
    warning: palette.warning.dark,
    warningSoft: '#33260A',
    danger: palette.danger.dark,
    dangerSoft: '#3A1316',
    info: palette.info.dark,
    infoSoft: '#132845',
    focusRing: palette.saffron[400],
    overlay: 'rgba(5, 4, 12, 0.7)',
    demo: palette.saffron[300],
    demoSoft: '#3A2C0C',
    skeleton: '#231F3B',
  },
};

export type ThemeName = keyof typeof themes;

export const typography = {
  fontFamily: {
    display: 'Bricolage Grotesque',
    body: 'Inter',
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

export const radii = { xs: 6, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32, full: 9999 } as const;

export const shadows = {
  sm: '0 1px 2px rgba(20, 17, 43, 0.06), 0 1px 1px rgba(20, 17, 43, 0.04)',
  md: '0 4px 12px rgba(20, 17, 43, 0.08), 0 2px 4px rgba(20, 17, 43, 0.05)',
  lg: '0 12px 32px rgba(20, 17, 43, 0.12), 0 4px 8px rgba(20, 17, 43, 0.06)',
  glow: '0 8px 30px rgba(255, 91, 46, 0.35)',
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

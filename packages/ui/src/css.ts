import { motion, radii, shadows, themes, typography, type SemanticColors } from './tokens';

/** Convertit un nom camelCase en variable CSS kebab-case (--tm-text-muted). */
export function cssVar(name: string): string {
  return `--tm-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
}

function themeBlock(colors: SemanticColors): string {
  return Object.entries(colors)
    .map(([key, value]) => `  ${cssVar(key)}: ${value};`)
    .join('\n');
}

/**
 * Feuille de variables CSS (thèmes clair/sombre). Le thème sombre s'applique avec
 * l'attribut data-theme="dark" ou, à défaut de choix explicite, selon le système.
 */
export function buildTokensCss(): string {
  const constants = [
    `  ${cssVar('fontDisplay')}: '${typography.fontFamily.display}', ui-sans-serif, system-ui, sans-serif;`,
    `  ${cssVar('fontBody')}: '${typography.fontFamily.body}', ui-sans-serif, system-ui, sans-serif;`,
    `  ${cssVar('fontArabic')}: '${typography.fontFamily.arabic}', 'Noto Sans Arabic', ui-sans-serif, sans-serif;`,
    ...Object.entries(radii).map(([key, value]) => `  ${cssVar(`radius-${key}`)}: ${value === 9999 ? '9999px' : `${value}px`};`),
    ...Object.entries(shadows).map(([key, value]) => `  ${cssVar(`shadow-${key}`)}: ${value};`),
    ...Object.entries(motion.duration).map(([key, value]) => `  ${cssVar(`duration-${key}`)}: ${value}ms;`),
    ...Object.entries(motion.easing).map(([key, value]) => `  ${cssVar(`ease-${key}`)}: ${value};`),
  ].join('\n');

  return [
    '/* Fichier généré par `pnpm --filter @tamurt/ui build:css` — ne pas modifier à la main. */',
    ':root {',
    '  color-scheme: light;',
    themeBlock(themes.light),
    constants,
    '}',
    '',
    ':root[data-theme="dark"] {',
    '  color-scheme: dark;',
    themeBlock(themes.dark),
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) {',
    '    color-scheme: dark;',
    themeBlock(themes.dark).replace(/^ {2}/gm, '    '),
    '  }',
    '}',
    '',
  ].join('\n');
}

import { palette } from './tokens';

/**
 * Logo Tamurt Events : monogramme « T » construit à partir de deux losanges (motif signature)
 * sur un carré arrondi. Original, sans référence à une marque tierce.
 * Exporté en SVG pour le web (favicon, en-tête) et le mobile (icône, splash).
 */
export function logoMarkSvg(options: { size?: number; background?: string; foreground?: string; accent?: string } = {}): string {
  const size = options.size ?? 512;
  const bg = options.background ?? palette.night[900];
  const fg = options.foreground ?? palette.ember[500];
  const accent = options.accent ?? palette.saffron[400];
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512" role="img" aria-label="Tamurt Events">`,
    `<rect width="512" height="512" rx="120" fill="${bg}"/>`,
    // Barre horizontale du T : losange allongé
    `<polygon points="96,176 256,112 416,176 256,240" fill="${fg}"/>`,
    // Fût du T : losange vertical
    `<polygon points="256,200 314,300 256,420 198,300" fill="${fg}"/>`,
    // Étincelle
    `<polygon points="380,300 398,330 380,360 362,330" fill="${accent}"/>`,
    '</svg>',
  ].join('');
}

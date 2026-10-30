/** Génération de slugs d'URL lisibles (ASCII), avec repli si le texte n'est pas latin (ex. arabe). */
export function slugify(input: string, maxLength = 80): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/gi, 'oe')
    .replace(/æ/gi, 'ae')
    .replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/&/g, ' et ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  if (slug.length <= maxLength) return slug;
  return slug.slice(0, maxLength).replace(/-+[^-]*$/, '').replace(/-+$/, '') || slug.slice(0, maxLength);
}

/** Slug unique « titre-xxxxxx » (suffixe court dérivé d'un identifiant). */
export function uniqueSlug(input: string, uniqueSuffix: string, fallbackPrefix = 'evenement'): string {
  const base = slugify(input, 70) || fallbackPrefix;
  const suffix = uniqueSuffix.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  return suffix ? `${base}-${suffix}` : base;
}

export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 120;
}

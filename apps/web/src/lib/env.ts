/**
 * Variables PUBLIQUES (préfixe NEXT_PUBLIC_, intégrées au bundle client) et URL du site.
 * Les secrets serveur sont lus uniquement par @tamurt/server (readServerEnv).
 */
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Variable d'environnement manquante : ${name} (voir apps/web/.env.example).`);
  return value;
}

export function supabasePublicConfig() {
  return {
    url: required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

/** URL canonique du site (liens absolus, SEO, e-mails). */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_ENV === 'production' ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}

export const mapStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';
export const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || null;

/** Les environnements de prévisualisation ne doivent jamais être indexés. */
export function isIndexable(): boolean {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === 'production';
  return process.env.NODE_ENV === 'production' && process.env.TAMURT_ALLOW_INDEXING === 'true';
}

/** Adresse de Tamurt Services (la maison mère) : active le bouton yaz de l'en-tête. Vide : pas de bouton. */
export function tamurtServicesUrl(): string | null {
  const value = process.env.TAMURT_SERVICES_URL?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

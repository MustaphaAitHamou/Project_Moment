'use client';
import { useTranslations } from 'next-intl';

/** Traduit une clé de validation partagée (« validation.required ») ou renvoie le texte tel quel. */
export function useTranslateError() {
  const t = useTranslations();
  return (message?: string | null): string | undefined => {
    if (!message) return undefined;
    if (/^(validation|errors)\.[a-z_]+$/.test(message) && t.has(message as never)) return t(message as never);
    return message;
  };
}

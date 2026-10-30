import { Info, Languages } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

/** Bandeau permanent tant que la plateforme fonctionne en mode démonstration. */
export async function DemoBanner() {
  const t = await getTranslations('app');
  return (
    <div className="border-b border-demo/25 bg-demo-soft">
      <p className="container-page flex items-start gap-2 py-2 text-xs leading-5 text-fg sm:items-center">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-demo sm:mt-0" aria-hidden />
        <span>{t('demoBanner')}</span>
      </p>
    </div>
  );
}

/** Avertissement : la traduction arabe n'a pas encore été relue par un traducteur natif. */
export async function ArabicDraftNotice() {
  const t = await getTranslations('app');
  return (
    <div className="border-b border-warning/25 bg-warning-soft">
      <p className="container-page flex items-center gap-2 py-1.5 text-xs text-fg">
        <Languages className="h-4 w-4 shrink-0 text-warning" aria-hidden />
        {t('arabicDraftNotice')}
      </p>
    </div>
  );
}

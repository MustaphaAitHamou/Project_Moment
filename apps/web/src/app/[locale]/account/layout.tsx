import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { AccountNav } from '@/components/account/account-nav';
import { Alert } from '@/components/ui/alert';
import { PRIVATE_METADATA } from '@/lib/seo';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = PRIVATE_METADATA;

/** Espace personnel : chaque page vérifie elle-même la session (redirection vers la connexion). */
export default async function AccountLayout({ children }: LayoutProps<'/[locale]/account'>) {
  const viewer = await getViewer();
  const t = await getTranslations('account');
  return (
    <div className="container-page grid gap-6 py-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
      <aside className="lg:sticky lg:top-24 lg:self-start">{viewer ? <AccountNav /> : null}</aside>
      <div className="min-w-0 space-y-6">
        {viewer?.suspended ? <Alert tone="danger">{t('suspended')}</Alert> : null}
        {children}
      </div>
    </div>
  );
}

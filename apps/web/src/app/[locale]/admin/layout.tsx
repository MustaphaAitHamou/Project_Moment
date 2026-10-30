import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AdminNav } from '@/components/admin/admin-nav';
import { Badge } from '@/components/ui/badge';
import { PRIVATE_METADATA } from '@/lib/seo';
import { getViewer } from '@/lib/session';

export const metadata: Metadata = PRIVATE_METADATA;

/**
 * Back-office : réservé à l'équipe Tamurt (modérateurs, administrateurs). Les autres visiteurs
 * obtiennent une 404. La protection d'une URL de prévisualisation n'est jamais une autorisation :
 * chaque action est revérifiée côté serveur et en base.
 */
export default async function AdminLayout({ children }: LayoutProps<'/[locale]/admin'>) {
  const viewer = await getViewer();
  if (!viewer) return <div className="container-page py-8">{children}</div>;
  if (!viewer.isStaff) notFound();
  const t = await getTranslations('admin');
  return (
    <div className="container-page grid gap-6 py-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
      <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
        <p className="flex items-center gap-2 font-display text-lg font-bold">{t('title')} <Badge tone={viewer.isAdmin ? 'danger' : 'secondary'}>{viewer.isAdmin ? 'admin' : 'moderator'}</Badge></p>
        <AdminNav />
      </aside>
      <div className="min-w-0 space-y-6">{children}</div>
    </div>
  );
}

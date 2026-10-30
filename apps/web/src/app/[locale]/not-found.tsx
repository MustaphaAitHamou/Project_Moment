import { Compass } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { buttonClasses } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('common');
  return (
    <div className="container-page py-16">
      <EmptyState
        icon={Compass}
        title={t('pageNotFound')}
        text={t('pageNotFoundText')}
        action={<Link href="/" className={buttonClasses()}>{t('goHome')}</Link>}
      />
    </div>
  );
}

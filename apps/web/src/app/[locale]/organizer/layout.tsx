import type { Metadata } from 'next';
import { PRIVATE_METADATA } from '@/lib/seo';

export const metadata: Metadata = PRIVATE_METADATA;

export default function OrganizerLayout({ children }: LayoutProps<'/[locale]/organizer'>) {
  return <div className="container-page py-8">{children}</div>;
}

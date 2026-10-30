import { categoryVisual, type CategoryIcon as CategoryIconName } from '@tamurt/ui';
import { Calendar, Drama, Frame, HandHeart, Landmark, Laugh, Mic, Music, Sparkles, Store, Tent, Trophy, Users, type LucideIcon } from 'lucide-react';

const ICONS: Record<CategoryIconName, LucideIcon> = {
  music: Music,
  festival: Tent,
  sparkles: Sparkles,
  theater: Drama,
  laugh: Laugh,
  mic: Mic,
  store: Store,
  frame: Frame,
  trophy: Trophy,
  hands: HandHeart,
  landmark: Landmark,
  family: Users,
  calendar: Calendar,
};

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ICONS[categoryVisual(slug).icon] ?? Calendar;
  return <Icon className={className} aria-hidden />;
}

export function categoryColor(slug: string): string {
  return categoryVisual(slug).color;
}

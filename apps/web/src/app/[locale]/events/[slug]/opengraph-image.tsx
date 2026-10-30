import { categoryVisual } from '@tamurt/ui';
import { ImageResponse } from 'next/og';
import { createSupabasePublicClient } from '@/lib/supabase/public';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Tamurt Events';

/** Image de partage générée (aucun visuel tiers) : titre, date locale, ville, catégorie. */
export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  let title = 'Tamurt Events';
  let subtitle = '';
  let color = '#E8401A';
  let demo = false;
  try {
    const { data } = await createSupabasePublicClient()
      .from('events')
      .select('title, starts_at, timezone, category_slug, is_demo, city:cities(names)')
      .eq('slug', slug)
      .maybeSingle();
    if (data) {
      title = data.title;
      demo = data.is_demo;
      color = categoryVisual(data.category_slug).color;
      const names = (data.city?.names ?? {}) as Record<string, string>;
      const date = new Intl.DateTimeFormat(locale === 'ar' ? 'fr' : locale, { timeZone: data.timezone, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(data.starts_at));
      subtitle = `${date} · ${names[locale] ?? names.fr ?? ''}`;
    }
  } catch {
    // image générique
  }
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 64, background: `linear-gradient(135deg, #14112B 0%, ${color} 140%)`, color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 34, fontWeight: 800 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#E8401A' }} />
          Tamurt Events
          {demo ? <div style={{ marginLeft: 24, padding: '6px 18px', borderRadius: 999, background: '#FFD254', color: '#14112B', fontSize: 26 }}>DÉMO</div> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontSize: title.length > 40 ? 64 : 80, fontWeight: 800, lineHeight: 1.05 }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 34, opacity: 0.85 }}>{subtitle}</div> : null}
        </div>
      </div>
    ),
    size,
  );
}

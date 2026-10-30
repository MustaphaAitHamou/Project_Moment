import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Tamurt Events',
    short_name: 'Tamurt',
    description: 'Découvrez, créez et réservez des événements en France, en Algérie, aux États-Unis et au Canada.',
    start_url: '/fr',
    display: 'standalone',
    background_color: '#F7F3EE',
    theme_color: '#E8401A',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

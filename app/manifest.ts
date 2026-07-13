import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: '#0d1b3e',
    description: '個人用ツール集',
    display: 'standalone',
    icons: [
      { sizes: '192x192', src: '/icons/icon-192.png', type: 'image/png' },
      { sizes: '512x512', src: '/icons/icon-512.png', type: 'image/png' },
      {
        purpose: 'maskable',
        sizes: '512x512',
        src: '/icons/icon-512-maskable.png',
        type: 'image/png',
      },
    ],
    name: 'Toolbox',
    short_name: 'Toolbox',
    start_url: '/',
    theme_color: '#0d1b3e',
  };
}

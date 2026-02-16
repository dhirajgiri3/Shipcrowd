import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Shipcrowd',
    short_name: 'Shipcrowd',
    description: 'AI-powered shipping platform for sellers and admin operations.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2525FF',
    icons: [
      {
        src: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}

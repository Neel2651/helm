import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest. This, plus the icons and a service worker, is what lets
// a browser offer "Add to Home Screen" / "Install app".
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Helm',
    short_name: 'Helm',
    description: 'Monitor, back up and configure every project from one place.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f4ef',
    theme_color: '#0e6e61',
    icons: [
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/192', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

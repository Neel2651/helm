import type { Metadata, Viewport } from 'next';
import './globals.css';
import RegisterServiceWorker from '../components/RegisterServiceWorker';

export const metadata: Metadata = {
  title: { default: 'Helm', template: '%s · Helm' },
  description: 'Monitor, back up and configure every project from one place.',
  robots: { index: false, follow: false },
  applicationName: 'Helm',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Helm' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0e6e61',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Manrope } from 'next/font/google';
import './globals.css';
import RegisterServiceWorker from '../components/RegisterServiceWorker';
import { BRAND } from '../lib/brand';

// Self-hosted at build time, so the hub does not block first paint on fonts.googleapis.com
// — which matters because it is usually behind a VPN or a locked-down network.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

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
  // 'cover' lets the app draw into the notch area; the safe-area padding that makes that
  // usable lives in globals.css and the shell components.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BRAND.paper },
    { media: '(prefers-color-scheme: dark)', color: BRAND.paperDark },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}

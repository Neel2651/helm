import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import RegisterServiceWorker from '../components/RegisterServiceWorker';
import { BRAND } from '../lib/brand';

// The font files live in the repo and are loaded with next/font/local, not
// next/font/google. next/font/google downloads from fonts.googleapis.com *at build time*,
// which fails on a hub that has no outbound access to Google — the build dies with
// "An error occurred in next/font". Keeping the files local means neither the build nor
// the browser ever needs to reach Google.
//
// Both are variable fonts, so one file covers the whole weight range.
const manrope = localFont({
  src: './fonts/manrope-latin.woff2',
  weight: '400 800',
  style: 'normal',
  variable: '--font-manrope',
  display: 'swap',
});

const jetbrainsMono = localFont({
  src: './fonts/jetbrains-mono-latin.woff2',
  weight: '400 500',
  style: 'normal',
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

// Note there is deliberately no maximum-scale / user-scalable here. The "page zooms in on
// mobile" problem is iOS auto-zooming when a focused form control has a font smaller than
// 16px, which is fixed where it is caused — inputs are text-base below md. Pinning the
// scale would not fix it anyway: Safari has ignored user-scalable, minimum-scale and
// maximum-scale on web pages since iOS 10, and it breaks pinch-zoom for anyone who needs it
// on the browsers that still honour it.
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

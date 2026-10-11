import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionValue } from './lib/session';

// Everything needs a session except: the login page; the collector ingest (it authenticates
// with its own per-project token); and the PWA files (manifest, icons, service worker), which
// browsers fetch before and independently of the signed-in page, and which hold nothing private.
const PUBLIC_PATHS = [
  '/login',
  '/api/login',
  '/api/ingest',
  '/manifest.webmanifest',
  '/icon',
  '/apple-icon',
  '/icons',
  '/sw.js',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const ok = await verifySessionValue(req.cookies.get('helm_session')?.value);
  if (!ok) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

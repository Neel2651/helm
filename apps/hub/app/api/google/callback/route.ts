import { NextResponse, type NextRequest } from 'next/server';
import { STATE_COOKIE, exchangeCode, publicOrigin, redirectUri } from '../../../../lib/drive';

function forwarded(req: NextRequest) {
  return {
    proto: req.headers.get('x-forwarded-proto'),
    host: req.headers.get('host'),
    forwardedHost: req.headers.get('x-forwarded-host'),
  };
}

function back(req: NextRequest, params: Record<string, string>) {
  // Built from the public origin, not req.url: behind a proxy req.url is the internal
  // http://localhost:3100, and redirecting there loses the session cookie.
  const url = new URL('/settings', publicOrigin(forwarded(req)));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = NextResponse.redirect(url);
  res.cookies.delete(STATE_COOKIE);
  return res;
}

// Where Google sends the browser after consent.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const denied = params.get('error');
  if (denied) return back(req, { google_error: `Google returned "${denied}".` });

  const code = params.get('code');
  const state = params.get('state');
  const expected = req.cookies.get(STATE_COOKIE)?.value;

  // Reject anything we did not start ourselves.
  if (!state || !expected || state !== expected) {
    return back(req, { google_error: 'The sign-in could not be verified. Start again from Settings.' });
  }
  if (!code) return back(req, { google_error: 'Google did not return an authorisation code.' });

  try {
    await exchangeCode(code, redirectUri(forwarded(req)));
  } catch (err) {
    return back(req, { google_error: err instanceof Error ? err.message : String(err) });
  }
  return back(req, { google_connected: '1' });
}

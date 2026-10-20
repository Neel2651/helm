import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { STATE_COOKIE, authorizeUrl, oauthClientConfigured, publicOrigin, redirectUri } from '../../../../lib/drive';

// Starts the Google consent flow. Behind the session check in middleware.ts.
export async function GET(req: NextRequest) {
  const forwarded = {
    proto: req.headers.get('x-forwarded-proto'),
    host: req.headers.get('host'),
    forwardedHost: req.headers.get('x-forwarded-host'),
  };
  const origin = publicOrigin(forwarded);

  if (!oauthClientConfigured()) {
    const url = new URL('/settings', origin);
    url.searchParams.set('google_error', 'Set HELM_GOOGLE_CLIENT_ID and HELM_GOOGLE_CLIENT_SECRET on the hub first.');
    return NextResponse.redirect(url);
  }

  const state = crypto.randomBytes(16).toString('base64url');
  const res = NextResponse.redirect(authorizeUrl(state, redirectUri(forwarded)));
  // 'lax' so the cookie survives the top-level redirect back from Google; 'strict' would not.
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https://'),
    path: '/',
    maxAge: 600,
  });
  return res;
}

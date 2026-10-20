import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { STATE_COOKIE, authorizeUrl, oauthClientConfigured, redirectUri } from '../../../../lib/drive';

// Starts the Google consent flow. Behind the session check in middleware.ts.
export async function GET(req: NextRequest) {
  if (!oauthClientConfigured()) {
    return NextResponse.redirect(
      new URL('/settings?google_error=' + encodeURIComponent('Set HELM_GOOGLE_CLIENT_ID and HELM_GOOGLE_CLIENT_SECRET on the hub first.'), req.url),
    );
  }

  const state = crypto.randomBytes(16).toString('base64url');
  const redirect = redirectUri({
    proto: req.headers.get('x-forwarded-proto'),
    host: req.headers.get('host'),
  });

  const res = NextResponse.redirect(authorizeUrl(state, redirect));
  // 'lax' so the cookie survives the top-level redirect back from Google; 'strict' would not.
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  return res;
}

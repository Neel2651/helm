import crypto from 'node:crypto';
import { getGoogleAuth, setGoogleAuth, clearGoogleAuth } from './store';
import { decrypt, encrypt } from './crypto';
import { notify } from './notify';
import type { GoogleDriveAuth } from './types';

// Minimal Google Drive client over REST. Uses one Google account and the drive.file scope,
// so Helm can only see the files and folders it created.
//
// The refresh token comes from the in-app connection (Settings -> Google Drive), which stores
// it encrypted. HELM_GOOGLE_REFRESH_TOKEN is still honoured as a fallback for hubs set up
// before that existed; the first successful refresh adopts it into the store.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
/** Short-lived cookie holding the OAuth `state` nonce between connect and callback. */
export const STATE_COOKIE = 'helm_google_state';
const SCOPES = `openid email ${DRIVE_SCOPE}`;

interface CachedToken {
  value: string | null;
  expiresAt: number;
}

let cachedToken: CachedToken = { value: null, expiresAt: 0 };

export function oauthClientConfigured(): boolean {
  return Boolean(process.env.HELM_GOOGLE_CLIENT_ID && process.env.HELM_GOOGLE_CLIENT_SECRET);
}

// The refresh token in use, preferring the connection made in the app.
function refreshToken(): string {
  const stored = getGoogleAuth();
  if (stored?.refreshToken_enc) {
    try {
      return decrypt(stored.refreshToken_enc);
    } catch {
      // A key change makes the stored value unreadable; fall through to the env var.
    }
  }
  return process.env.HELM_GOOGLE_REFRESH_TOKEN?.trim() || '';
}

/**
 * Whether a backup could be attempted. Cheap and synchronous on purpose: pages call it while
 * rendering, so it must never touch the network. It does not prove the token still works —
 * driveStatus() does that.
 */
export function driveConfigured(): boolean {
  return Boolean(oauthClientConfigured() && refreshToken());
}

/** True once Google has rejected the refresh token and nobody has reconnected since. */
export function driveNeedsReconnect(): boolean {
  return getGoogleAuth()?.lastError === 'invalid_grant';
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

// Google's error codes are opaque in the UI, so say what each one actually means here.
export function explainTokenError(code: string, detail?: string): string {
  if (code === 'invalid_grant') {
    return 'Google has expired or revoked the saved authorisation. This happens when the OAuth consent screen is left in "Testing" (tokens die after 7 days), when the Google account password changes, or when access is removed from the Google account. Reconnect Google Drive in Settings.';
  }
  if (code === 'invalid_client') {
    return 'Google rejected the client ID or secret. Check HELM_GOOGLE_CLIENT_ID and HELM_GOOGLE_CLIENT_SECRET on the hub.';
  }
  if (code === 'unauthorized_client' || code === 'access_denied') {
    return 'This OAuth client is not allowed to make this request. Check the client type is "Web application" and that the redirect URI is registered.';
  }
  return detail ? `${code} (${detail})` : code;
}

async function postForm(url: string, fields: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
    signal: AbortSignal.timeout(20_000),
  });
}

async function accessToken(): Promise<string> {
  if (cachedToken.value && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;

  const token = refreshToken();
  if (!oauthClientConfigured() || !token) {
    throw new Error('Google Drive is not connected. Connect it in Settings.');
  }

  const res = await postForm(TOKEN_URL, {
    client_id: process.env.HELM_GOOGLE_CLIENT_ID || '',
    client_secret: process.env.HELM_GOOGLE_CLIENT_SECRET || '',
    refresh_token: token,
    grant_type: 'refresh_token',
  });
  const empty: TokenResponse = {};
  const json = ((await res.json().catch(() => empty)) as TokenResponse) ?? empty;

  if (!res.ok || !json.access_token) {
    const code = json.error || 'unknown_error';
    // Record it so Settings can show the real reason, and say so once on Telegram rather
    // than leaving it to be discovered at the next backup.
    if (getGoogleAuth() && code !== getGoogleAuth()?.lastError) {
      setGoogleAuth({ lastError: code, lastErrorAt: new Date().toISOString() });
      await notify(`🔴 Google Drive disconnected: ${explainTokenError(code, json.error_description)}`);
    } else if (getGoogleAuth()) {
      setGoogleAuth({ lastError: code, lastErrorAt: new Date().toISOString() });
    }
    throw new Error(`Google Drive authorisation failed. ${explainTokenError(code, json.error_description)}`);
  }

  // Google may hand back a replacement refresh token; keep it or the next refresh fails.
  const patch: Partial<GoogleDriveAuth> = { lastRefreshAt: new Date().toISOString(), lastError: null, lastErrorAt: null };
  if (json.refresh_token) patch.refreshToken_enc = encrypt(json.refresh_token);
  else if (!getGoogleAuth()?.refreshToken_enc) patch.refreshToken_enc = encrypt(token); // adopt the env-var token
  setGoogleAuth(patch);

  // expires_in is documented but not guaranteed; Number(undefined) is NaN, which would make
  // the cache check above always false and re-hit this endpoint on every single call.
  const ttl = Number(json.expires_in) || 3600;
  cachedToken = { value: json.access_token, expiresAt: Date.now() + ttl * 1000 };
  return json.access_token;
}

// J is the shape of the JSON body a call sends (inferred from the literal passed as `json`);
// callers that send no body never need to name it. T is the shape of the parsed response.
interface ApiOptions<J> {
  method?: string;
  json?: J;
  body?: BodyInit;
  headers?: Record<string, string>;
}

async function api<T = void, J = never>(url: string, { method = 'GET', json, body, headers = {} }: ApiOptions<J> = {}): Promise<T> {
  const send = async () => {
    const token = await accessToken();
    return fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : body,
      signal: AbortSignal.timeout(300_000),
    });
  };

  let res = await send();
  // A token revoked mid-run still looks valid to the cache. Drop it and try once more
  // rather than failing a backup that is already half done.
  if (res.status === 401) {
    cachedToken = { value: null, expiresAt: 0 };
    res = await send();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google Drive ${method} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Connecting and disconnecting -------------------------------------------------------

/**
 * Where Google sends the browser back to. Google matches this exactly against the list
 * registered on the OAuth client, so it has to be stable: set HELM_PUBLIC_URL on the hub.
 * The request headers are only a convenience for local development.
 */
export interface ForwardedHeaders {
  proto?: string | null;
  host?: string | null;
  forwardedHost?: string | null;
}

/**
 * The origin a browser reaches this hub on.
 *
 * Every user-facing redirect has to be built from this rather than from the incoming
 * request URL. Behind a reverse proxy, Next sees the internal origin (http://localhost:3100),
 * so redirecting against req.url sends the browser to localhost — where it has no session
 * cookie and gets bounced to the login page.
 *
 * HELM_PUBLIC_URL wins when set. Otherwise this reads the proxy's forwarded headers, which
 * the sample nginx config sends.
 */
export function publicOrigin(headers?: ForwardedHeaders): string {
  const configured = process.env.HELM_PUBLIC_URL?.trim().replace(/\/+$/, '');
  if (configured) return configured;
  // X-Forwarded-* may be a comma-separated chain; the first entry is the original client.
  const first = (v?: string | null) => v?.split(',')[0]?.trim() || '';
  const host = first(headers?.forwardedHost) || first(headers?.host) || 'localhost:3100';
  const proto = first(headers?.proto) || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export function redirectUri(headers?: ForwardedHeaders): string {
  return `${publicOrigin(headers)}/api/google/callback`;
}

/** The Google consent URL. `state` is echoed back and checked to block CSRF. */
export function authorizeUrl(state: string, redirect: string): string {
  const params = new URLSearchParams({
    client_id: process.env.HELM_GOOGLE_CLIENT_ID || '',
    redirect_uri: redirect,
    response_type: 'code',
    scope: SCOPES,
    // Both are required to be handed a refresh token: offline asks for one at all, and
    // consent forces a fresh one even when this account has already approved Helm.
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_URL}?${params}`;
}

function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split('.')[1];
    const json = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { email?: string };
    return json.email || null;
  } catch {
    return null;
  }
}

/** Exchanges the one-time code from the consent redirect for a lasting refresh token. */
export async function exchangeCode(code: string, redirect: string): Promise<void> {
  const res = await postForm(TOKEN_URL, {
    client_id: process.env.HELM_GOOGLE_CLIENT_ID || '',
    client_secret: process.env.HELM_GOOGLE_CLIENT_SECRET || '',
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirect,
  });
  const empty: TokenResponse = {};
  const json = ((await res.json().catch(() => empty)) as TokenResponse) ?? empty;

  if (!res.ok || !json.access_token) {
    throw new Error(explainTokenError(json.error || 'unknown_error', json.error_description));
  }
  if (!json.refresh_token) {
    throw new Error(
      'Google returned no refresh token, so the connection would stop working within the hour. Remove Helm at myaccount.google.com/permissions and connect again.',
    );
  }

  cachedToken = { value: null, expiresAt: 0 };
  setGoogleAuth({
    refreshToken_enc: encrypt(json.refresh_token),
    email: emailFromIdToken(json.id_token),
    scope: json.scope || SCOPES,
    connectedAt: new Date().toISOString(),
    lastRefreshAt: new Date().toISOString(),
    lastError: null,
    lastErrorAt: null,
  });
}

/** Revokes the grant at Google, then forgets it locally. */
export async function disconnectDrive(): Promise<void> {
  const token = refreshToken();
  if (token) {
    // Best effort: an already-dead token 400s here, which is fine — we are discarding it.
    await postForm(REVOKE_URL, { token }).catch(() => undefined);
  }
  cachedToken = { value: null, expiresAt: 0 };
  clearGoogleAuth();
}

export interface DriveStatus {
  connected: boolean;
  email: string | null;
  error: string | null;
  usingEnvFallback: boolean;
}

/**
 * A real check: actually asks Google for an access token. Hits the network, so call it from
 * the settings page and the "Test connection" action only — never from a hot render path.
 */
export async function driveStatus(): Promise<DriveStatus> {
  const stored = getGoogleAuth();
  const usingEnvFallback = !stored?.refreshToken_enc && Boolean(process.env.HELM_GOOGLE_REFRESH_TOKEN);

  if (!oauthClientConfigured()) {
    return { connected: false, email: null, error: 'No OAuth client. Set HELM_GOOGLE_CLIENT_ID and HELM_GOOGLE_CLIENT_SECRET on the hub.', usingEnvFallback };
  }
  if (!refreshToken()) {
    return { connected: false, email: null, error: null, usingEnvFallback };
  }
  try {
    await accessToken();
    return { connected: true, email: getGoogleAuth()?.email || null, error: null, usingEnvFallback };
  } catch (err) {
    return {
      connected: false,
      email: stored?.email || null,
      error: err instanceof Error ? err.message : String(err),
      usingEnvFallback,
    };
  }
}

// Escape a value for a Drive query string literal.
const escapeQ = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

interface FileList {
  files?: { id: string; name: string; createdTime?: string }[];
}

async function findFolder(name: string, parentId: string): Promise<string | null> {
  const query = `name='${escapeQ(name)}' and mimeType='${FOLDER_MIME}' and '${parentId}' in parents and trashed=false`;
  const data = await api<FileList>(`${DRIVE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`);
  return data.files?.[0]?.id || null;
}

interface CreatedFile {
  id: string;
}

interface FolderCreateBody {
  name: string;
  mimeType: string;
  parents: string[];
}

// "Backups/codedharma-web" → folder id, creating any missing folders.
export async function ensureFolderPath(path: string): Promise<string> {
  let parent = 'root';
  for (const segment of path.split('/').map((s) => s.trim()).filter(Boolean)) {
    let id = await findFolder(segment, parent);
    if (!id) {
      const created = await api<CreatedFile, FolderCreateBody>(`${DRIVE}/files?fields=id`, {
        method: 'POST',
        json: { name: segment, mimeType: FOLDER_MIME, parents: [parent] },
      });
      id = created.id;
    }
    parent = id;
  }
  return parent;
}

export interface UploadResult {
  id: string;
  md5Checksum: string;
  size?: string;
}

// Multipart upload. Returns the Drive file id and its md5, which we compare with our local md5.
export async function uploadBackup(folderId: string, name: string, buffer: Buffer): Promise<UploadResult> {
  const boundary = `helm${crypto.randomBytes(8).toString('hex')}`;
  const metadata = JSON.stringify({ name, parents: [folderId] });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  return api<UploadResult>(`${UPLOAD}?uploadType=multipart&fields=id,md5Checksum,size`, {
    method: 'POST',
    headers: { 'content-type': `multipart/related; boundary=${boundary}` },
    body,
  });
}

// Keeps the newest `keep` Helm backups in the folder and deletes the rest.
export async function deleteOldBackups(folderId: string, keep: number): Promise<number> {
  const query = `'${folderId}' in parents and name contains '.zip.enc' and trashed=false`;
  const data = await api<FileList>(
    `${DRIVE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime)&pageSize=1000&orderBy=createdTime desc`,
  );
  const old = (data.files || []).slice(keep);
  for (const file of old) {
    await api(`${DRIVE}/files/${file.id}`, { method: 'DELETE' });
  }
  return old.length;
}

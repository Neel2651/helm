import crypto from 'node:crypto';

// Minimal Google Drive client over REST. Uses one Google account (refresh token) and the
// drive.file scope, so Helm can only see the files and folders it created.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

interface CachedToken {
  value: string | null;
  expiresAt: number;
}

let cachedToken: CachedToken = { value: null, expiresAt: 0 };

export function driveConfigured(): boolean {
  return Boolean(
    process.env.HELM_GOOGLE_CLIENT_ID &&
      process.env.HELM_GOOGLE_CLIENT_SECRET &&
      process.env.HELM_GOOGLE_REFRESH_TOKEN,
  );
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

async function accessToken(): Promise<string> {
  if (cachedToken.value && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;

  const body = new URLSearchParams({
    client_id: process.env.HELM_GOOGLE_CLIENT_ID || '',
    client_secret: process.env.HELM_GOOGLE_CLIENT_SECRET || '',
    refresh_token: process.env.HELM_GOOGLE_REFRESH_TOKEN || '',
    grant_type: 'refresh_token',
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const empty: TokenResponse = {};
  const json = ((await res.json().catch(() => empty)) as TokenResponse) ?? empty;
  if (!res.ok || !json.access_token) {
    const code = json.error || 'unknown_error';
    const detail = json.error_description ? ` (${json.error_description})` : '';
    throw new Error(`Google sign-in failed (${res.status}): ${code}${detail}`);
  }
  const token = json.access_token;
  cachedToken = { value: token, expiresAt: Date.now() + Number(json.expires_in) * 1000 };
  return token;
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
  const token = await accessToken();
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : body,
    signal: AbortSignal.timeout(300_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Google Drive ${method} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
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

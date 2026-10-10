import { importPKCS8, SignJWT } from 'jose';
import { connect } from 'node:http2';
import { notificationPreview } from '@/lib/notification-preview';
import { pushImageUrl } from '@/lib/push-image';

export type PushOutcome = 'sent' | 'retry' | 'invalid' | 'failed' | 'cancelled';
export interface PushResult { outcome: PushOutcome; error?: string }
export interface PushMessage { id: string; recipientId: string; title: string; body?: string | null; imageUrl?: string | null }
export interface PushDestination { provider: 'fcm' | 'apns'; environment: 'production' | 'sandbox'; token: string }

let fcmAccess: { token: string; expires: number } | undefined;
let apnsAccess: { token: string; expires: number } | undefined;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server setting: ${name}`);
  return value.trim();
}

export function normalizePrivateKey(raw: string): string {
  let value = raw.trim();
  if (value.startsWith('"')) {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'string') throw new Error('Private key JSON must contain a PEM string, not an object.');
    value = parsed;
  } else if (value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1);
  }
  value = value.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
  if (!/^-----BEGIN PRIVATE KEY-----\s+[\s\S]+\s+-----END PRIVATE KEY-----$/.test(value)) {
    throw new Error('Private key must be a complete PKCS#8 PEM value, not a key ID or service-account JSON object.');
  }
  return value;
}

function privateKey(name: 'FIREBASE_PRIVATE_KEY' | 'APNS_PRIVATE_KEY'): string {
  try { return normalizePrivateKey(required(name)); }
  catch (error) {
    throw new Error(`${name}: ${error instanceof Error ? error.message : 'Invalid key format'}`);
  }
}

async function fcmToken(): Promise<string> {
  if (fcmAccess && fcmAccess.expires > Date.now()) return fcmAccess.token;
  const key = await importPKCS8(privateKey('FIREBASE_PRIVATE_KEY'), 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/firebase.messaging' })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(required('FIREBASE_CLIENT_EMAIL'))
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt().setExpirationTime('1h').sign(key);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!response.ok) throw new Error(`FCM server authentication failed: HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null || !('access_token' in body) ||
      typeof body.access_token !== 'string' || !('expires_in' in body) || typeof body.expires_in !== 'number') {
    throw new Error('FCM server returned an invalid authentication response');
  }
  fcmAccess = { token: body.access_token, expires: Date.now() + Math.max(0, body.expires_in - 60) * 1000 };
  return fcmAccess.token;
}

export function classifyFcm(status: number, code: string): PushResult {
  if (status >= 200 && status < 300) return { outcome: 'sent' };
  if (code === 'UNREGISTERED') return { outcome: 'invalid', error: code };
  return { outcome: status === 429 || status >= 500 || status === 401 ? 'retry' : 'failed',
    error: `FCM HTTP ${status}: ${code || 'UNKNOWN'}` };
}

export function classifyApns(status: number, reason: string): PushResult {
  if (status === 200) return { outcome: 'sent' };
  if (status === 410 && reason === 'Unregistered') return { outcome: 'invalid', error: reason };
  return { outcome: status === 429 || status >= 500 || reason === 'ExpiredProviderToken' ? 'retry' : 'failed',
    error: `APNs HTTP ${status}: ${reason || 'UNKNOWN'}` };
}

function fcmErrorCode(value: unknown): string {
  if (typeof value !== 'object' || value === null || !('error' in value) ||
      typeof value.error !== 'object' || value.error === null) return 'UNKNOWN';
  const error = value.error;
  if ('details' in error && Array.isArray(error.details)) {
    for (const detail of error.details) {
      if (typeof detail === 'object' && detail !== null &&
          detail['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError' &&
          typeof detail.errorCode === 'string') return detail.errorCode;
    }
  }
  return 'status' in error && typeof error.status === 'string' ? error.status : 'UNKNOWN';
}

async function sendFcm(destination: PushDestination, message: PushMessage): Promise<PushResult> {
  const project = required('FIREBASE_PROJECT_ID');
  const token = await fcmToken();
  const image = pushImageUrl(message.imageUrl);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(project)}/messages:send`, {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: {
      token: destination.token,
      notification: {
        title: message.title.slice(0, 80),
        body: notificationPreview(message.body) || '세움에서 새 알림을 확인해주세요.',
        ...(image ? { image } : {}),
      },
      data: { notificationId: message.id, recipientId: message.recipientId, ...(image ? { imageUrl: image } : {}) },
      android: { priority: 'high', ttl: '86400s', notification: {
        channel_id: 'seum-notifications', tag: message.id, icon: 'ic_stat_seum',
      } },
    } }),
  });
  if (response.status === 401) fcmAccess = undefined;
  const body: unknown = await response.json();
  if (response.ok && (typeof body !== 'object' || body === null || !('name' in body) || typeof body.name !== 'string')) {
    throw new Error('FCM returned an invalid send response');
  }
  return classifyFcm(response.status, fcmErrorCode(body));
}

async function apnsToken(): Promise<string> {
  if (apnsAccess && apnsAccess.expires > Date.now()) return apnsAccess.token;
  const key = await importPKCS8(privateKey('APNS_PRIVATE_KEY'), 'ES256');
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: required('APNS_KEY_ID') })
    .setIssuer(required('APNS_TEAM_ID')).setIssuedAt().sign(key);
  apnsAccess = { token, expires: Date.now() + 50 * 60 * 1000 };
  return token;
}

async function sendApns(destination: PushDestination, message: PushMessage): Promise<PushResult> {
  const token = await apnsToken();
  const host = destination.environment === 'sandbox'
    ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com';
  return new Promise((resolve, reject) => {
    const client = connect(host);
    let status = 0;
    let body = '';
    let settled = false;
    const finish = (result?: PushResult, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      client.destroy();
      if (error) reject(error);
      else if (result) resolve(result);
    };
    const timeout = setTimeout(() => finish(undefined, new Error('APNs send timed out')), 10000);
    client.on('error', (error) => finish(undefined, error));
    client.on('close', () => { if (!settled) finish(undefined, new Error('APNs connection closed before a response')); });
    const request = client.request({
      ':method': 'POST', ':path': `/3/device/${destination.token}`,
      authorization: `bearer ${token}`,
      'apns-topic': 'life.seum.app', 'apns-push-type': 'alert', 'apns-priority': '10',
      'apns-collapse-id': message.id, 'apns-expiration': String(Math.floor(Date.now() / 1000) + 86400),
    });
    request.setEncoding('utf8');
    request.on('response', (headers) => { status = Number(headers[':status']); });
    request.on('data', (chunk: string) => { body += chunk; });
    request.on('error', (error) => finish(undefined, error));
    request.on('end', () => {
      try {
        const value: unknown = body ? JSON.parse(body) : {};
        const reason = typeof value === 'object' && value !== null && 'reason' in value &&
          typeof value.reason === 'string' ? value.reason : 'UNKNOWN';
        if (reason === 'ExpiredProviderToken') apnsAccess = undefined;
        finish(classifyApns(status, reason));
      } catch (error) {
        finish(undefined, error instanceof Error ? error : new Error('APNs returned an invalid response'));
      }
    });
    request.end(JSON.stringify({
      aps: { alert: { title: message.title.slice(0, 80), body: notificationPreview(message.body) || '세움에서 새 알림을 확인해주세요.' }, sound: 'default' },
      notificationId: message.id, recipientId: message.recipientId,
    }));
  });
}

export async function sendNativePush(destination: PushDestination, message: PushMessage): Promise<PushResult> {
  return destination.provider === 'fcm' ? sendFcm(destination, message) : sendApns(destination, message);
}

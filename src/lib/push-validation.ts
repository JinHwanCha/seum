export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PushRegistration {
  installationId: string;
  platform: 'android' | 'ios';
  provider: 'fcm' | 'apns';
  environment: 'production' | 'sandbox';
  token: string;
}

export interface PushReference { notificationId: string; recipientId: string }

export function parsePushReference(value: unknown): PushReference | null {
  if (typeof value !== 'object' || value === null || !('notificationId' in value) ||
      !('recipientId' in value) || typeof value.notificationId !== 'string' ||
      typeof value.recipientId !== 'string' || !UUID_PATTERN.test(value.notificationId) ||
      !UUID_PATTERN.test(value.recipientId)) return null;
  return { notificationId: value.notificationId, recipientId: value.recipientId };
}

export function parsePushRegistration(value: unknown): PushRegistration | null {
  if (typeof value !== 'object' || value === null) return null;
  if (!('installationId' in value) || typeof value.installationId !== 'string' ||
      !UUID_PATTERN.test(value.installationId) || !('token' in value) ||
      typeof value.token !== 'string' || value.token.length < 16 || value.token.length > 4096 ||
      /\s/.test(value.token) || !('platform' in value) || !('provider' in value) ||
      !('environment' in value)) return null;
  if (value.platform === 'android' && value.provider === 'fcm' && value.environment === 'production') {
    return { installationId: value.installationId, platform: 'android', provider: 'fcm',
      environment: 'production', token: value.token };
  }
  if (value.platform === 'ios' && value.provider === 'apns' &&
      (value.environment === 'sandbox' || value.environment === 'production') &&
      /^[0-9a-f]{64,200}$/i.test(value.token)) {
    return { installationId: value.installationId, platform: 'ios', provider: 'apns',
      environment: value.environment, token: value.token };
  }
  return null;
}

export function parseInstallationId(value: unknown): string | null {
  return typeof value === 'object' && value !== null && 'installationId' in value &&
    typeof value.installationId === 'string' && UUID_PATTERN.test(value.installationId)
    ? value.installationId : null;
}

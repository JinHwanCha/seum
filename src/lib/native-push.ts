import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { UUID_PATTERN, type PushRegistration } from '@/lib/push-validation';

export const PUSH_DISABLED_KEY = 'seum-push-disabled';
export const PUSH_PENDING_KEY = 'seum-push-pending';
let installationPromise: Promise<string> | undefined;
let registrationTask: Promise<boolean> = Promise.resolve(false);
let suspended = false;
let transitioning = false;

export function nativePushAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications') &&
    Capacitor.isPluginAvailable('Preferences');
}

export function getInstallationId(): Promise<string> {
  if (!installationPromise) {
    installationPromise = (async () => {
      const { value } = await Preferences.get({ key: 'seum-installation-id' });
      if (value && UUID_PATTERN.test(value)) return value;
      const id = crypto.randomUUID();
      await Preferences.set({ key: 'seum-installation-id', value: id });
      return id;
    })();
    installationPromise.catch((error: unknown) => {
      installationPromise = undefined;
      console.error('Native installation ID setup failed:', error);
    });
  }
  return installationPromise;
}

export async function checkPushResponse(response: Response): Promise<Record<string, unknown>> {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('알림 API에 연결하지 못했습니다. 로그인 상태와 웹 서버 배포를 확인해주세요.');
  }
  const body: unknown = await response.json();
  if (typeof body !== 'object' || body === null) throw new Error('알림 서버의 응답이 올바르지 않습니다.');
  if (!response.ok) {
    throw new PushApiError('error' in body && typeof body.error === 'string' ? body.error : '알림 서버 요청에 실패했습니다.', response.status);
  }
  return Object.fromEntries(Object.entries(body));
}

export class PushApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

export async function requestPushApi(url: string, options: RequestInit): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    return await checkPushResponse(await fetch(url, { ...options, signal: controller.signal }));
  } catch (error) {
    if (controller.signal.aborted) throw new Error('알림 서버 연결 시간이 초과되었습니다. 다시 시도해주세요.');
    throw error;
  } finally { clearTimeout(timer); }
}

export function allowNativeRegistration() {
  if (transitioning) throw new Error('로그아웃 또는 알림 해제 처리 중입니다. 잠시 후 다시 시도해주세요.');
  suspended = false;
}
export function cancelNativePushTransition() { transitioning = false; }

export function persistNativeToken(token: string): Promise<boolean> {
  const register = async () => {
    if (suspended) return false;
    const platform = Capacitor.getPlatform();
    if (platform !== 'android' && platform !== 'ios') throw new Error('지원하지 않는 앱 플랫폼입니다.');
    const environment = platform === 'android' ? 'production' : process.env.NEXT_PUBLIC_APNS_ENVIRONMENT;
    if (environment !== 'production' && environment !== 'sandbox') {
      throw new Error('iOS APNs 환경 설정이 필요합니다.');
    }
    const payload: PushRegistration = {
      installationId: await getInstallationId(), platform,
      provider: platform === 'android' ? 'fcm' : 'apns', environment, token,
    };
    if (suspended) return false;
    const body = await requestPushApi('/api/push/devices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    if (body.success !== true) throw new Error('알림 기기 등록이 완료되지 않았습니다.');
    return true;
  };
  registrationTask = registrationTask.then(register, register);
  return registrationTask;
}

export async function prepareNativeLogout(): Promise<string | undefined> {
  if (!nativePushAvailable()) return undefined;
  transitioning = true;
  suspended = true;
  try { await registrationTask; }
  catch (error) { console.error('Pending push registration failed before logout:', error instanceof Error ? error.message : 'Unknown error'); }
  return getInstallationId();
}

export async function finishNativeLogout() {
  if (!nativePushAvailable()) return;
  try {
    await Preferences.remove({ key: PUSH_PENDING_KEY });
    await PushNotifications.unregister();
    await PushNotifications.removeAllDeliveredNotifications();
  } finally { transitioning = false; }
}

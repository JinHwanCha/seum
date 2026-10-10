'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAuth } from '@/hooks/use-auth';
import { parsePushReference, type PushReference } from '@/lib/push-validation';
import { pushImageUrl } from '@/lib/push-image';
import {
  allowNativeRegistration, finishNativeLogout, nativePushAvailable,
  persistNativeToken, prepareNativeLogout, PUSH_DISABLED_KEY, PUSH_PENDING_KEY,
  requestPushApi,
  cancelNativePushTransition,
  PushApiError,
} from '@/lib/native-push';

interface PushContextValue {
  native: boolean; ready: boolean; status: string; error: string | null;
  enable: () => Promise<void>; disable: () => Promise<void>;
  test: () => Promise<void>;
  openingNotification: boolean;
  openedNotificationId: string | null;
}
const PushContext = createContext<PushContextValue | null>(null);

export function NativePushProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const userRef = useRef(user);
  userRef.current = user;
  const opening = useRef(false);
  const lastRegisteredAt = useRef(0);
  const [resolving, setResolving] = useState(false);
  const [navigating, startNavigation] = useTransition();
  const [native, setNative] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('알림 권한을 확인해주세요.');
  const [error, setError] = useState<string | null>(null);
  const [incoming, setIncoming] = useState<(PushReference & { title: string; body?: string; imageUrl?: string }) | null>(null);
  const [openedNotificationId, setOpenedNotificationId] = useState<string | null>(null);

  const report = useCallback((cause: unknown) => {
    const message = cause instanceof Error ? cause.message : '앱 알림 처리에 실패했습니다.';
    setError(message);
    console.error('Native push operation failed:', message);
  }, []);

  const openPending = useCallback(async () => {
    const session = userRef.current;
    if (!session || session.requiresGroupSelection || opening.current) return;
    opening.current = true;
    try {
      const { value } = await Preferences.get({ key: PUSH_PENDING_KEY });
      if (!value) return;
      const reference = parsePushReference(JSON.parse(value));
      if (!reference) throw new Error('알림 이동 정보가 올바르지 않습니다.');
      setResolving(true);
      if (reference.recipientId !== session.userId) {
        await Preferences.remove({ key: PUSH_PENDING_KEY });
        throw new Error('다른 계정의 알림입니다. 해당 계정으로 로그인해 알림 목록을 확인해주세요.');
      }
      setOpenedNotificationId(reference.notificationId);
      const data = await requestPushApi(`/api/push/notifications/${reference.notificationId}`, { cache: 'no-store' });
      if (typeof data.href !== 'string' || !data.href.startsWith('/') || data.href.startsWith('//')) {
        throw new Error('알림의 이동 경로가 올바르지 않습니다.');
      }
      if (userRef.current?.userId !== session.userId) return;
      await Preferences.remove({ key: PUSH_PENDING_KEY });
      setIncoming(null);
      const href = data.href;
      startNavigation(() => router.push(href));
      requestPushApi('/api/notifications/read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [reference.notificationId] }),
      }).then((result) => {
        if (result.success !== true) throw new Error('알림 읽음 처리를 완료하지 못했습니다.');
        window.dispatchEvent(new Event('seum-notifications-changed'));
      }).catch(report);
    } catch (cause) {
      if (cause instanceof PushApiError && cause.status === 404) {
        await Preferences.remove({ key: PUSH_PENDING_KEY });
      }
      throw cause;
    } finally { opening.current = false; setResolving(false); }
  }, [router, report]);

  const enable = useCallback(async () => {
    if (!ready || !userRef.current || userRef.current.requiresGroupSelection) return;
    setError(null);
    try {
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive !== 'granted') permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') {
        setStatus('알림 권한이 거부되었습니다. 휴대폰 설정에서 세움 알림을 허용해주세요.');
        return;
      }
      await Preferences.set({ key: PUSH_DISABLED_KEY, value: 'false' });
      allowNativeRegistration();
      setStatus('기기 토큰 등록 중…');
      await PushNotifications.register();
    } catch (cause) { report(cause); }
  }, [ready, report]);

  useEffect(() => { setOpenedNotificationId(null); }, [user?.userId]);

  const disable = useCallback(async () => {
    setError(null);
    try {
      const installationId = await prepareNativeLogout();
      if (!installationId) throw new Error('앱 업데이트 후 알림 설정을 이용해주세요.');
      const data = await requestPushApi('/api/push/devices', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installationId }),
      });
      if (data.success !== true) throw new Error('알림 기기 해제에 실패했습니다.');
      await Preferences.set({ key: PUSH_DISABLED_KEY, value: 'true' });
      await finishNativeLogout();
      setStatus('이 기기의 Push 알림이 꺼졌습니다.');
    } catch (cause) {
      cancelNativePushTransition();
      report(cause);
    }
  }, [report]);

  const test = useCallback(async () => {
    setError(null);
    try {
      const data = await requestPushApi('/api/push/test', { method: 'POST' });
      if (data.success !== true) throw new Error('테스트 알림을 저장하지 못했습니다.');
      setStatus('테스트 알림 작업을 저장했습니다. 서버 발송 작업이 실행되면 알림이 도착합니다.');
    } catch (cause) { report(cause); }
  }, [report]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    setNative(true);
    if (!nativePushAvailable()) {
      setStatus('Push 기능이 포함된 최신 APK를 설치해주세요.');
      return;
    }
    let disposed = false;
    const handles: PluginListenerHandle[] = [];
    const listen = async (promise: Promise<PluginListenerHandle>) => {
      const handle = await promise;
      if (disposed) await handle.remove();
      else handles.push(handle);
    };
    const initialize = async () => {
      await listen(PushNotifications.addListener('registration', ({ value }) => {
        const owner = userRef.current;
        if (!owner || owner.requiresGroupSelection) return;
        persistNativeToken(value).then((registered) => {
          if (registered && !disposed && userRef.current?.userId === owner.userId) {
            lastRegisteredAt.current = Date.now();
            setStatus('이 기기의 Push 등록이 완료되었습니다.');
          }
        }).catch(report);
      }));
      await listen(PushNotifications.addListener('registrationError', () => {
        report(new Error('기기 토큰 발급에 실패했습니다. Firebase 또는 APNs 설정을 확인해주세요.'));
      }));
      await listen(PushNotifications.addListener('pushNotificationReceived', (notification) => {
        const reference = parsePushReference(notification.data);
        if (!reference || reference.recipientId !== userRef.current?.userId) return;
        const data: unknown = notification.data;
        const image = typeof data === 'object' && data !== null && 'imageUrl' in data
          ? pushImageUrl(data.imageUrl) : undefined;
        setIncoming({ ...reference, title: notification.title || '새 알림', body: notification.body, imageUrl: image });
        window.dispatchEvent(new Event('seum-notifications-changed'));
      }));
      await listen(PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
        const reference = parsePushReference(notification.data);
        if (!reference) { report(new Error('알림에 상세 이동 정보가 없습니다.')); return; }
        Preferences.set({ key: PUSH_PENDING_KEY, value: JSON.stringify(reference) })
          .then(openPending).catch(report);
      }));
      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'seum-notifications', name: '세움 공지 및 알림', importance: 4, visibility: 0,
        });
      }
      if (!disposed) setReady(true);
    };
    initialize().catch(report);
    return () => {
      disposed = true;
      handles.forEach((handle) => { handle.remove().catch(report); });
    };
  }, [openPending, report]);

  useEffect(() => {
    const session = userRef.current;
    if (!ready || !session || session.requiresGroupSelection) return;
    lastRegisteredAt.current = 0;
    const resume = async () => {
      if (document.visibilityState === 'hidden') return;
      await openPending();
      if (Date.now() - lastRegisteredAt.current < 5 * 60 * 1000) return;
      const { value } = await Preferences.get({ key: PUSH_DISABLED_KEY });
      if (value === 'true') { setStatus('이 기기의 Push 알림이 꺼졌습니다.'); return; }
      if (value !== 'false') return;
      const permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'granted') {
        await PushNotifications.register();
      }
    };
    const onResume = () => { resume().catch(report); };
    onResume();
    document.addEventListener('visibilitychange', onResume);
    return () => document.removeEventListener('visibilitychange', onResume);
  }, [ready, user?.userId, user?.exp, user?.requiresGroupSelection, openPending, report]);

  return (
    <PushContext.Provider value={{
      native, ready, status, error, enable, disable, test,
      openingNotification: resolving || navigating, openedNotificationId,
    }}>
      {children}
      {native && (resolving || navigating) && (
        <div role="status" className="fixed top-[calc(env(safe-area-inset-top)+1rem)] left-3 right-3 z-[70] rounded-xl warm-surface border border-primary-200 p-3 text-sm shadow-lg">
          알림 여는 중…
        </div>
      )}
      {native && incoming && (
        <div className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+1rem)] z-[60] rounded-xl warm-surface border border-primary-200 p-4 shadow-lg">
          <div className="flex gap-3 items-start">
            {incoming.imageUrl && <Image src={incoming.imageUrl} alt="게시글 첫 이미지" width={56} height={56} unoptimized
              className="rounded-lg shrink-0 object-cover" onError={() => {
                setIncoming((current) => current ? { ...current, imageUrl: undefined } : null);
              }} />}
            <div className="min-w-0">
              <p className="text-xs text-primary-700 mb-1">세움 알림</p>
              <p className="text-sm font-semibold line-clamp-2">{incoming.title}</p>
              {incoming.body && <p className="mt-1 text-xs text-stone-600 line-clamp-2">{incoming.body}</p>}
            </div>
          </div>
          <button disabled={resolving || navigating} className="mt-3 text-sm text-primary-700 disabled:opacity-50" onClick={() => {
            Preferences.set({ key: PUSH_PENDING_KEY, value: JSON.stringify(incoming) }).then(openPending).catch(report);
          }}>알림 열기</button>
          <button className="ml-4 text-sm text-stone-500" onClick={() => setIncoming(null)}>닫기</button>
        </div>
      )}
      {native && error && (
        <div role="alert" className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] left-3 right-3 z-[60] rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
          <button className="ml-3 underline" onClick={() => setError(null)}>닫기</button>
        </div>
      )}
    </PushContext.Provider>
  );
}

export function NativePushSettings() {
  const context = useContext(PushContext);
  if (!context?.native) return null;
  return (
    <section className="warm-surface rounded-xl border border-stone-200 p-4 space-y-2">
      <h2 className="font-semibold">앱 Push 알림</h2>
      <p className="text-sm text-stone-600">{context.status}</p>
      <p className="text-xs text-stone-500">허용하면 공지·댓글·공감 알림을 받습니다. 휴대폰 설정에 따라 잠금 화면에 제목과 본문 미리보기가 표시될 수 있습니다.</p>
      <div className="flex flex-wrap gap-4 text-sm">
        <button disabled={!context.ready} className="text-primary-700 disabled:opacity-50" onClick={context.enable}>알림 권한 요청 / 등록</button>
        <button disabled={!context.ready} className="text-stone-600 disabled:opacity-50" onClick={context.disable}>이 기기 알림 끄기</button>
        <button disabled={!context.ready} className="text-primary-700 disabled:opacity-50" onClick={context.test}>테스트 알림 보내기</button>
      </div>
      {context.error && <p role="alert" className="text-sm text-red-600">{context.error}</p>}
    </section>
  );
}

export function useNativePushNavigation() {
  const context = useContext(PushContext);
  return {
    opening: context?.native ? context.openingNotification : false,
    openedId: context?.native ? context.openedNotificationId : null,
  };
}

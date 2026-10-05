const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./helpers/load-source.cjs');

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function fixture() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let user = { userId: '11111111-1111-4111-8111-111111111111', exp: 9999999999 };
  const listeners = new Map();
  const documentListeners = new Map();
  const values = new Map([['disabled', 'false']]);
  const routes = [];
  const requests = [];
  let registrations = 0;
  const lookup = deferred();
  const read = deferred();
  const react = {
    createContext: () => ({ Provider: 'PushContext' }),
    useState: (value) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof value === 'function' ? value() : value;
      return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef: (value) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: value };
      return slots[index];
    },
    useCallback: (fn, deps) => {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous.deps[i]))) slots[index] = { fn, deps };
      return slots[index].fn;
    },
    useEffect: (fn, deps) => {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous[i]))) effects.push(fn);
      slots[index] = deps;
    },
    useTransition: () => { cursor++; return [false, (fn) => fn()]; },
  };
  const jsx = (type, props) => ({ type, props });
  const validation = load('src\\lib\\push-validation.ts');
  const provider = load('src\\components\\notifications\\native-push-provider.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/image': () => null,
    'next/navigation': { useRouter: () => router },
    '@capacitor/core': { Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } },
    '@capacitor/preferences': { Preferences: {
      get: async ({ key }) => ({ value: values.get(key) || null }),
      set: async ({ key, value }) => { values.set(key, value); },
      remove: async ({ key }) => { values.delete(key); },
    } },
    '@capacitor/push-notifications': { PushNotifications: {
      addListener: async (name, fn) => { listeners.set(name, fn); return { remove: async () => {} }; },
      createChannel: async () => {},
      checkPermissions: async () => ({ receive: 'granted' }),
      register: async () => { registrations++; listeners.get('registration')({ value: 'token' }); },
    } },
    '@/hooks/use-auth': { useAuth: () => ({ user }) },
    '@/lib/push-validation': validation,
    '@/lib/native-push': {
      PUSH_DISABLED_KEY: 'disabled', PUSH_PENDING_KEY: 'pending', nativePushAvailable: () => true,
      persistNativeToken: async () => true,
      PushApiError: class extends Error {},
      requestPushApi: (url) => { requests.push(url); return url.includes('/api/push/notifications/') ? lookup.promise : read.promise; },
    },
  }, {}, {
    document: { visibilityState: 'visible', addEventListener: (name, fn) => documentListeners.set(name, fn), removeEventListener: (name) => documentListeners.delete(name) },
    window: { dispatchEvent: () => {} },
  }).NativePushProvider;
  const router = { push: (href) => routes.push(href) };
  function render() {
    cursor = 0;
    effects = [];
    const tree = provider({ children: null });
    effects.forEach((effect) => effect());
    return tree;
  }
  function nodes() {
    const all = [];
    const visit = (node) => {
      if (Array.isArray(node)) { node.forEach(visit); return; }
      if (!node || typeof node !== 'object') return;
      all.push(node);
      visit(node.props?.children);
    };
    visit(render());
    return all;
  }
  return {
    render, nodes, listeners, routes, requests, lookup, read,
    registrations: () => registrations,
    replaceUserObject: () => { user = { ...user }; },
    resume: () => documentListeners.get('visibilitychange')(),
  };
}

async function initialize(subject) {
  subject.render();
  await new Promise(setImmediate);
  subject.render();
  await new Promise(setImmediate);
  subject.render();
}

test('push clicks show immediate progress and navigate before the read POST finishes', async () => {
  const subject = fixture();
  await initialize(subject);
  const action = { notification: { data: {
    notificationId: '33333333-3333-4333-8333-333333333333',
    recipientId: '11111111-1111-4111-8111-111111111111',
  } } };
  subject.listeners.get('pushNotificationActionPerformed')(action);
  subject.listeners.get('pushNotificationActionPerformed')(action);
  await new Promise(setImmediate);
  assert.ok(subject.nodes().some((node) => node.props?.role === 'status'));
  assert.equal(subject.requests.length, 1);
  assert.equal(subject.routes.length, 0);
  subject.lookup.resolve({ href: '/church/department/boards/notice/post' });
  await new Promise(setImmediate);
  assert.equal(subject.routes[0], '/church/department/boards/notice/post');
  assert.equal(subject.requests[1], '/api/notifications/read');
  subject.read.resolve({ success: true });
  await new Promise(setImmediate);
});

test('same-session page rerenders and immediate app resumes do not re-register the token', async () => {
  const subject = fixture();
  await initialize(subject);
  assert.equal(subject.registrations(), 1);
  subject.replaceUserObject();
  subject.render();
  await new Promise(setImmediate);
  subject.resume();
  await new Promise(setImmediate);
  assert.equal(subject.registrations(), 1);
});

test('foreground banners include the brand image and body preview', async () => {
  const subject = fixture();
  await initialize(subject);
  subject.listeners.get('pushNotificationReceived')({
    title: '새 공지', body: '공지 내용 미리보기',
    data: { notificationId: '33333333-3333-4333-8333-333333333333', recipientId: '11111111-1111-4111-8111-111111111111' },
  });
  const nodes = subject.nodes();
  assert.ok(nodes.some((node) => node.props?.src === '/push-icon.png'));
  assert.ok(nodes.some((node) => node.props?.children === '공지 내용 미리보기'));
});

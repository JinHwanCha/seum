const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./helpers/load-source.cjs');
const gestures = load('src\\lib\\pull-refresh.ts');

test('pull refresh excludes authentication, editing and administrative forms', () => {
  for (const route of ['/login', '/register', '/church/department/profile', '/church/department/boards/notice/new',
    '/church/department/boards/notice/post/edit', '/church/department/admin/members']) {
    assert.equal(gestures.pullRefreshAllowed(route), false);
  }
  for (const route of ['/church/department', '/church/department/boards/notice', '/church/department/bible']) {
    assert.equal(gestures.pullRefreshAllowed(route), true);
  }
});

test('gesture threshold requires a deliberate vertical pull and caps indicator travel', () => {
  assert.equal(gestures.pullRefreshDistance(100, 50), 0);
  assert.equal(gestures.pullRefreshDistance(0, -20), 0);
  assert.ok(gestures.pullRefreshDistance(0, 100) < gestures.PULL_REFRESH_THRESHOLD);
  assert.equal(gestures.pullRefreshDistance(0, 144), gestures.PULL_REFRESH_THRESHOLD);
  assert.equal(gestures.pullRefreshDistance(0, 1000), 96);
});

test('web browsers do not register touch interception handlers', () => {
  let listeners = 0;
  const effects = [];
  const component = load('src\\components\\layout\\native-pull-refresh.tsx', {
    react: {
      useEffect: (effect) => effects.push(effect), useRef: (value) => ({ current: value }),
      useState: (value) => [value, () => {}], useTransition: () => [false, (fn) => fn()],
    },
    'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
    'next/navigation': { usePathname: () => '/church/department', useRouter: () => ({ refresh: () => {} }) },
    '@capacitor/core': { Capacitor: { isNativePlatform: () => false } },
    swr: { useSWRConfig: () => ({ cache: new Map(), mutate: async () => {} }) },
    'lucide-react': {},
    '@/hooks/use-auth': { useAuth: () => ({ user: { userId: 'user' } }) },
    '@/lib/pull-refresh': gestures,
  }, {}, { document: { addEventListener: () => { listeners++; } } }).NativePullRefresh;
  component();
  effects.forEach((effect) => effect());
  assert.equal(listeners, 0);
});

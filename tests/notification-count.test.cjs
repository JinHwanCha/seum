const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./helpers/load-source.cjs');

test('header count uses a session-scoped shared cache, not a per-path fetch', async () => {
  const listeners = new Map();
  let key;
  let options;
  let fetcher;
  let refreshes = 0;
  const component = load('src\\components\\notifications\\notification-bell.tsx', {
    react: { useEffect: (fn) => fn() },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    swr: { __esModule: true, default: (k, f, config) => {
      key = k; fetcher = f; options = config;
      return { data: 4, mutate: async () => { refreshes++; } };
    } },
    'next/link': 'Link',
    'next/navigation': { useParams: () => ({ church: 'church', department: 'department' }) },
    'lucide-react': { Bell: 'Bell' },
    '@/hooks/use-auth': { useAuth: () => ({ user: { userId: 'user', departmentId: 'department', exp: 123 } }) },
    '@/lib/native-push': { requestPushApi: async () => ({ unreadCount: 4 }) },
  }, {}, { window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: () => {} } }).NotificationBell;
  component();
  assert.deepEqual(Array.from(key), ['notification-count', 'user', 'department', 123]);
  assert.equal(options.dedupingInterval, 15000);
  assert.equal(options.refreshInterval, 60000);
  assert.equal(options.keepPreviousData, false);
  assert.equal(await fetcher(), 4);
  listeners.get('seum-notifications-changed')();
  await new Promise(setImmediate);
  assert.equal(refreshes, 1);
});

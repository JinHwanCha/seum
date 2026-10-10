const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./helpers/load-source.cjs');

const jsx = (type, props) => ({ type, props });
const themes = load('src\\lib\\themes.ts');
const stored = load('src\\lib\\persistent-cache.ts');

test('initial theme state is identical on server and browser before effects', () => {
  for (const browser of [false, true]) {
    const captured = [];
    const provider = load('src\\components\\theme\\theme-provider.tsx', {
      react: {
        createContext: () => ({ Provider: 'Context' }),
        useState: (initial) => { captured.push(initial); return [initial, () => {}]; },
        useCallback: (fn) => fn, useRef: () => ({ current: false }), useEffect: () => {},
      },
      'react/jsx-runtime': { jsx },
      '@/lib/themes': themes,
    }, {}, browser ? {
      document: { documentElement: { getAttribute: () => 'dark' } },
      localStorage: { getItem: () => 'dark' },
    } : {}).ThemeProvider;
    provider({ children: null });
    assert.equal(captured[0], 'green');
  }
});

test('SWR starts empty on server and client; persisted data restoration only runs in effects', async () => {
  const effects = [];
  let storageReads = 0;
  const restored = [];
  const map = new Map();
  const provider = load('src\\components\\providers.tsx', {
    react: { useState: (fn) => [fn(), () => {}], useEffect: (fn) => effects.push(fn) },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    swr: { SWRConfig: 'SWRConfig', useSWRConfig: () => ({
      cache: map, mutate: async (key, data) => restored.push({ key, data }),
    }) },
    '@/lib/persistent-cache': stored,
    '@/hooks/use-auth': { AuthProvider: 'AuthProvider' },
    '@/components/theme/theme-provider': { ThemeProvider: 'ThemeProvider' },
    '@/components/notifications/native-push-provider': { NativePushProvider: 'NativePushProvider' },
    '@/components/theme/native-system-bars': { NativeSystemBars: 'NativeSystemBars' },
    '@/components/layout/navigation-provider': { NavigationProvider: 'NavigationProvider' },
    '@/components/board/board-cache-invalidator': { BoardCacheInvalidator: 'BoardCacheInvalidator' },
    '@/components/layout/native-pull-refresh': { NativePullRefresh: 'NativePullRefresh' },
  }, {}, {
    localStorage: { getItem: () => { storageReads++; return JSON.stringify([['cached-key', { data: { posts: ['stored'] }, _k: ['original'] }]]); } },
    window: { addEventListener: () => {}, removeEventListener: () => {} },
    document: { addEventListener: () => {}, removeEventListener: () => {} },
  }).Providers;
  const tree = provider({ initialUser: { userId: 'user' }, children: null });
  assert.equal(tree.props.value.provider().size, 0);
  assert.equal(storageReads, 0);
  const persistence = tree.props.children[0];
  persistence.type(persistence.props);
  assert.equal(storageReads, 0);
  const cleanup = effects[0]();
  await new Promise(setImmediate);
  assert.equal(storageReads, 1);
  assert.equal(restored[0].data.posts[0], 'stored');
  cleanup();
});

test('persisted cache skips unfinished entries and invalid JSON is explicit', () => {
  const entries = stored.readStoredCache(JSON.stringify([
    ['valid', { data: { value: 1 }, _k: ['key'] }], ['pending', { isValidating: true }],
    ['invalid', null], [123, { data: {} }],
  ]));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].key, 'valid');
  assert.throws(() => stored.readStoredCache('{'));
  assert.throws(() => stored.readStoredCache('{}'), /must be an array/);
});

test('board preload starts on navigation intent, deduplicates and uses the user cache', async () => {
  const cache = new Map();
  const requests = [];
  let release;
  const network = new Promise((resolve) => { release = resolve; });
  const session = {
    userId: 'user', churchId: 'church', departmentId: 'department', role: 'cell_member',
    churchSlug: 'church', departmentSlug: 'department', exp: 9999999999,
  };
  const board = load('src\\lib\\board-cache.ts');
  const hook = load('src\\components\\board\\use-board-prefetch.ts', {
    react: { useCallback: (fn) => fn },
    swr: { unstable_serialize: (key) => key.join('|'), useSWRConfig: () => ({
      cache, mutate: async (key, request) => { const value = await request; cache.set(key.join('|'), { data: value }); },
    }) },
    '@/hooks/use-auth': { useAuth: () => ({ user: session }) },
    '@/lib/board-cache': { ...board, fetchBoard: (key) => { requests.push(key); return network; } },
  }).useBoardPrefetch;
  const prefetch = hook();
  prefetch('/church/department/boards/notice');
  prefetch('/church/department/boards/notice');
  hook()('/church/department/boards/notice');
  prefetch('/other/department/boards/notice');
  prefetch('/church/department/boards/notice/post');
  assert.equal(requests.length, 1);
  release({ fetchedAt: Date.now(), posts: [] });
  await new Promise(setImmediate);
  prefetch('/church/department/boards/notice');
  assert.equal(requests.length, 1);
});

test('prefetch and mounted board share one in-flight API request', async () => {
  let requests = 0;
  let finish;
  const response = new Promise((resolve) => { finish = resolve; });
  const board = load('src\\lib\\board-cache.ts', { fetch: () => { requests++; return response; } });
  const key = ['user', '/api/posts?boardType=notice&includeMeta=1'];
  const prefetch = board.fetchBoard(key);
  const mounted = board.fetchBoard([...key]);
  assert.equal(prefetch, mounted);
  assert.equal(requests, 1);
  finish(Response.json({ posts: [], hasMore: false, villages: [], categories: [], villageMap: {} }));
  await mounted;
});

const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./helpers/load-source.cjs');

const cache = load('src\\lib\\board-cache.ts');
const session = { userId: 'user', churchId: 'church', departmentId: 'dept', role: 'cell_member', villageId: 'village', exp: 9999999999 };
const payload = { posts: [{ id: 'existing-post' }], hasMore: false, villages: [], categories: [], villageMap: {}, fetchedAt: Date.now() };

test('board cache is partitioned by user, church, department, permission, session and board', () => {
  const initial = cache.boardCacheKey(session, 'notice').join('|');
  for (const [key, value] of [['userId', 'another-user'], ['churchId', 'another-church'],
    ['departmentId', 'another-dept'], ['role', 'minister'], ['villageId', 'another-village'], ['exp', 1]]) {
    assert.notEqual(cache.boardCacheKey({ ...session, [key]: value }, 'notice').join('|'), initial);
  }
  assert.notEqual(cache.boardCacheKey(session, 'sharing').join('|'), initial);
});

test('cached lists are usable for five minutes, never after invalidation or from the future', () => {
  assert.equal(cache.boardCacheUsable({ ...payload, fetchedAt: 1000 }, 1000 + 299999), true);
  assert.equal(cache.boardCacheUsable({ ...payload, fetchedAt: 1000 }, 1000 + 300000), false);
  assert.equal(cache.boardCacheUsable({ ...payload, fetchedAt: 0 }, 1000), false);
  assert.equal(cache.boardCacheUsable({ ...payload, fetchedAt: 2000 }, 1000), false);
  assert.equal(cache.boardCacheUsable(undefined), false);
});

test('cache fetcher rejects errors and malformed responses rather than showing an empty success list', async () => {
  const loaded = load('src\\lib\\board-cache.ts', { fetch: async () => Response.json(payload) });
  const fetched = await loaded.fetchBoard(cache.boardCacheKey(session, 'notice'));
  assert.equal(fetched.posts[0].id, 'existing-post');
  assert.ok(fetched.fetchedAt > 0);
  for (const response of [
    new Response('<html>login</html>'), Response.json({ error: '조회 실패' }, { status: 503 }),
    Response.json({ posts: [] }),
  ]) {
    const failed = load('src\\lib\\board-cache.ts', { fetch: async () => response });
    await assert.rejects(() => failed.fetchBoard(cache.boardCacheKey(session, 'notice')));
  }
});

test('cached board renders existing posts while network revalidation is pending', () => {
  let data = payload;
  let error;
  const listeners = new Map();
  let config;
  const jsx = (type, props) => ({ type, props });
  const component = load('src\\components\\board\\cached-board.tsx', {
    react: { useEffect: (effect) => effect() },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    swr: { default: (_key, _fetcher, options) => { config = options; return { data, error, mutate: async () => {} }; }, __esModule: true },
    '@/hooks/use-auth': { useAuth: () => ({ user: session }) },
    '@/lib/board-cache': cache,
    '@/components/board/post-list': { PostList: 'PostList' },
  }, {}, { window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: () => {} } }).CachedBoard;
  let tree = component({ boardType: 'notice' });
  assert.equal(tree.props.children[1].type, 'PostList');
  assert.equal(tree.props.children[1].props.posts[0].id, 'existing-post');
  assert.equal(config.keepPreviousData, false);
  assert.equal(config.revalidateOnMount, true);
  assert.equal(config.revalidateOnFocus, true);
  assert.equal(config.refreshInterval, 60000);
  error = new Error('Temporary API failure');
  tree = component({ boardType: 'notice' });
  assert.equal(tree.props.children[1].type, 'PostList', 'a short-lived cache stays visible with an explicit error');
  data = { ...payload, fetchedAt: 0 };
  tree = component({ boardType: 'notice' });
  assert.equal(tree.props.children[1], null, 'invalidated content is not presented as fresh');
});

test('mutation invalidation only expires the active user board keys, including unmounted boards', async () => {
  const listeners = new Map();
  let invocation;
  const invalidator = load('src\\components\\board\\board-cache-invalidator.tsx', {
    react: { useEffect: (effect) => effect() },
    swr: { useSWRConfig: () => ({ mutate: async (...args) => { invocation = args; } }) },
    '@/lib/board-cache': cache,
    '@/hooks/use-auth': { useAuth: () => ({ user: session }) },
  }, {}, { window: { addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: () => {} } }).BoardCacheInvalidator;
  invalidator();
  listeners.get(cache.BOARD_CHANGED_EVENT)();
  await new Promise(setImmediate);
  assert.equal(invocation[0](cache.boardCacheKey(session, 'notice')), true);
  assert.equal(invocation[0](cache.boardCacheKey({ ...session, userId: 'other' }, 'notice')), false);
  assert.equal(invocation[1](payload).fetchedAt, 0);
  assert.equal(invocation[2].revalidate, true);
});

test('board server loader starts posts and metadata in parallel and surfaces DB failures', async () => {
  for (const fail of [false, true]) {
    const started = [];
    let finishPosts;
    const posts = new Promise((resolve) => { finishPosts = resolve; });
    const loader = load('src\\lib\\board-data.ts', {
      '@/lib/supabase': { createClient: () => ({
        from: (table) => {
          const query = {
            select: () => query, eq: () => query, order: () => query,
            maybeSingle: () => { started.push(table); return Promise.resolve({ data: { villages: [{ id: 'village', name: 'Village', sort_order: 1 }] } }); },
            then: (resolve, reject) => {
              started.push(table);
              return Promise.resolve(fail ? { error: new Error('DB unavailable') } : { data: [] }).then(resolve, reject);
            },
          };
          return query;
        },
      }) },
      '@/lib/posts-data': { loadBoardPosts: () => { started.push('posts'); return posts; } },
    });
    const pending = loader.loadBoardData(session, 'notice');
    await new Promise(setImmediate);
    assert.ok(started.includes('posts'));
    assert.ok(started.includes('group_years'));
    assert.ok(started.includes('board_categories'));
    finishPosts({ posts: payload.posts, hasMore: false });
    if (fail) await assert.rejects(pending, /DB unavailable/);
    else {
      const result = await pending;
      assert.equal(result.posts[0].id, 'existing-post');
      assert.equal(result.villageMap.village, 'Village');
    }
  }
});

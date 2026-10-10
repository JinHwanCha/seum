const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./helpers/load-source.cjs');

const session = { userId: 'user', departmentId: 'department', role: 'cell_member', villageId: 'village' };

function fixture({ visibility = 'all', department = 'department', author = 'other', failure = null } = {}) {
  const calls = [];
  const post = { id: 'post', slug: 'short-slug', board_type: 'gathering', department_id: department,
    author_id: author, visibility, village_id: 'another-village' };
  const data = load('src\\lib\\post-detail-data.ts', {
    '@/lib/posts-data': { postLookupColumn: (identifier) => identifier === 'post' ? 'id' : 'slug' },
    '@/lib/supabase': { createClient: () => ({
      from: (table) => {
        calls.push({ table });
        const query = {
          select: (columns) => { calls.push({ columns }); return query; },
          eq: (key, value) => { calls.push({ table, key, value }); return query; },
          order: () => query,
          maybeSingle: async () => {
            const foreign = calls.some((call) => call.key === 'department_id' && call.value !== department);
            return { data: foreign ? null : post, error: failure };
          },
          then: (resolve, reject) => Promise.resolve({ data: [], error: failure }).then(resolve, reject),
        };
        return query;
      },
    }) },
  });
  return { data, calls };
}

test('post content uses one tenant-scoped slug lookup without waiting for comments or reactions', async () => {
  const subject = fixture();
  const result = await subject.data.loadPostContent(session, 'gathering', 'short-slug');
  assert.equal(result.slug, 'short-slug');
  assert.deepEqual(subject.calls.filter((call) => call.table && !call.key), [{ table: 'posts' }]);
  assert.ok(subject.calls.some((call) => call.key === 'slug' && call.value === 'short-slug'));
  assert.ok(subject.calls.some((call) => call.key === 'department_id' && call.value === 'department'));
  assert.ok(subject.calls.some((call) => call.key === 'board_type' && call.value === 'gathering'));
  assert.ok(!subject.calls.some((call) => call.columns?.includes('comments(') || call.columns?.includes('reactions(')));
  assert.ok(!subject.calls.some((call) => call.columns?.includes('*')), 'content selects only rendered fields');
});

test('visibility and DB errors are not replaced with a successful post', async () => {
  assert.equal(await fixture({ visibility: 'pastor' }).data.loadPostContent(session, 'gathering', 'post'), null);
  assert.equal(await fixture({ visibility: 'village' }).data.loadPostContent(session, 'gathering', 'post'), null);
  assert.equal(await fixture({ department: 'another' }).data.loadPostContent(session, 'gathering', 'post'), null);
  assert.ok(await fixture({ visibility: 'pastor', author: 'user' }).data.loadPostContent(session, 'gathering', 'post'));
  assert.ok(await fixture({ visibility: 'pastor' }).data.loadPostContent({ ...session, role: 'minister' }, 'gathering', 'post'));
  await assert.rejects(fixture({ failure: new Error('DB unavailable') }).data.loadPostContent(session, 'gathering', 'post'), /DB unavailable/);
});

test('detail page returns its content before the interaction component executes', async () => {
  let interactionCalls = 0;
  const post = { id: 'post', slug: 'short-slug' };
  const jsx = (type, props) => ({ type, props });
  const page = load('src\\app\\[church]\\[department]\\boards\\[type]\\[postId]\\page.tsx', {
    react: { Suspense: 'Suspense' },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { redirect: () => { throw new Error('redirect'); }, notFound: () => { throw new Error('notFound'); } },
    '@/lib/auth': { getSession: async () => session },
    '@/lib/post-detail-data': {
      loadPostContent: async () => post,
      loadPostInteractions: () => { interactionCalls++; return new Promise(() => {}); },
    },
    '@/components/board/post-interactions': { PostInteractions: 'PostInteractions' },
    '@/components/ui/page-pending': { PagePending: 'PagePending' },
    './post-detail-client': { __esModule: true, default: 'PostDetailClient' },
  }).default;
  const tree = await page({ params: { church: 'church', department: 'department', type: 'gathering', postId: 'short-slug' } });
  assert.equal(tree.type, 'PostDetailClient');
  assert.equal(tree.props.post.id, 'post');
  assert.equal(tree.props.children.type, 'Suspense');
  assert.equal(interactionCalls, 0, 'post page does not await its streamed comments');
});

test('interactions keep both sections and surface errors', async () => {
  const subject = fixture();
  const data = await subject.data.loadPostInteractions('post');
  assert.deepEqual(Array.from(data.comments), []);
  assert.deepEqual(Array.from(data.reactions), []);
  assert.equal(subject.calls.filter((call) => call.table && !call.key).length, 2);
  assert.ok(!subject.calls.some((call) => call.columns?.includes('*')), 'interaction payload does not select unused columns');
  await assert.rejects(fixture({ failure: new Error('DB error') }).data.loadPostInteractions('post'), /DB error/);
});

test('React server stream emits post content while comments are still pending', async () => {
  const React = require('react');
  const { renderToPipeableStream } = require('react-dom/server');
  const { PassThrough } = require('node:stream');
  let release;
  const waiting = new Promise((resolve) => { release = resolve; });
  const tree = await load('src\\app\\[church]\\[department]\\boards\\[type]\\[postId]\\page.tsx', {
    react: React,
    '@/lib/auth': { getSession: async () => session },
    '@/lib/post-detail-data': {
      loadPostContent: async () => ({ id: 'post', slug: 'slug', title: 'POST_VISIBLE_FIRST' }),
      loadPostInteractions: () => waiting,
    },
    '@/components/board/post-interactions': {
      PostInteractions: () => React.createElement('div', null, 'INTERACTIONS_READY'),
    },
    '@/components/ui/page-pending': { PagePending: () => null },
    './post-detail-client': {
      __esModule: true,
      default: ({ post, children }) => React.createElement('article', null, post.title, children),
    },
  }).default({ params: { church: 'church', department: 'department', type: 'gathering', postId: 'slug' } });
  // React 18 Node SSR cannot invoke async server components directly; resolve only
  // the streamed interaction element once its real data promise completes.
  let completed = false;
  const deferredElement = tree.props.children.props.children;
  const completion = deferredElement.type(deferredElement.props).then((element) => {
    completed = true;
    return element;
  });

  test('legacy detail API shares the tenant-checked loader and preserves response shape', async () => {
    const calls = [];
    const route = load('src\\app\\api\\posts\\[id]\\route.ts', {
      '@/lib/auth': { getSession: async () => session },
      '@/lib/supabase': { createClient: () => { throw new Error('GET must use shared detail loader'); } },
      '@/lib/permissions': {},
      '@/lib/post-detail-data': {
        loadPostContent: async (owner, type, identifier) => { calls.push({ owner, type, identifier }); return { id: 'resolved-id' }; },
        loadPostInteractions: async (id) => { calls.push({ id }); return { comments: [], reactions: [] }; },
      },
    });
    const response = await route.GET(new Request('https://seum.test/api/posts/slug'), { params: { id: 'slug' } });
    assert.equal(response.status, 200);
    assert.equal(calls[0].owner.userId, session.userId);
    assert.equal(calls[0].identifier, 'slug');
    assert.equal(calls[1].id, 'resolved-id');
    const body = await response.json();
    assert.equal(body.post.id, 'resolved-id');
    assert.ok(Array.isArray(body.comments));
    assert.ok(Array.isArray(body.reactions));
  });
  let resolved;
  completion.then((element) => { resolved = element; });
  function DeferredInteractions() {
    if (!completed) throw completion;
    return resolved;
  }
  const streamTree = React.createElement(tree.type, tree.props,
    React.createElement(React.Suspense, { fallback: null }, React.createElement(DeferredInteractions)));
  const output = new PassThrough();
  let html = '';
  output.on('data', (chunk) => { html += chunk.toString(); });
  const finished = new Promise((resolve, reject) => {
    output.on('end', resolve);
    output.on('error', reject);
  });
  const stream = renderToPipeableStream(streamTree, { onShellReady: () => stream.pipe(output) });
  try {
    await new Promise(setImmediate);
    assert.ok(html.includes('POST_VISIBLE_FIRST'));
    assert.equal(html.includes('INTERACTIONS_READY'), false);
    release({ comments: [], reactions: [] });
    await finished;
    assert.ok(html.includes('INTERACTIONS_READY'));
  } finally { stream.abort(); }
});

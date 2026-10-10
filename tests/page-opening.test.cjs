const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const load = require('./helpers/load-source.cjs');

const root = path.join(__dirname, '..');
const jsx = (type, props) => ({ type, props });
const runtime = { jsx, jsxs: jsx };

test('page pending state has no visible cards, spinners, animations or reserved height', () => {
  const { PagePending } = load('src\\components\\ui\\page-pending.tsx', {
    'react/jsx-runtime': runtime,
  });
  const tree = PagePending();
  assert.equal(tree.type, 'span');
  assert.equal(tree.props.className, 'sr-only');
  assert.equal(tree.props.role, 'status');
  assert.equal(tree.props.children, '내용을 불러오는 중입니다.');
});

test('route loading boundaries keep streaming but use the nonvisual pending state', () => {
  const pagePending = () => null;
  for (const file of [
    'src\\app\\[church]\\[department]\\loading.tsx',
    'src\\app\\[church]\\[department]\\boards\\[type]\\[postId]\\loading.tsx',
  ]) {
    const component = load(file, { '@/components/ui/page-pending': { PagePending: pagePending } });
    assert.equal(component.default, pagePending);
  }
});

test('board route loading boundary uses the same visible skeleton as its first data fetch', () => {
  const skeleton = () => null;
  const route = load('src\\app\\[church]\\[department]\\boards\\[type]\\loading.tsx', {
    '@/components/board/board-skeleton': { BoardSkeleton: skeleton },
  });
  assert.equal(route.default, skeleton);
});

test('page UI only animates the requested board skeleton', () => {
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (file.endsWith('.tsx')) {
        if (entry.name !== 'board-skeleton.tsx') {
          assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /animate-pulse/, file);
        }
        const boardBoundary = path.join(root, 'src', 'app', '[church]', '[department]', 'boards', '[type]', 'loading.tsx');
        if (!['board-skeleton.tsx', 'cached-board.tsx'].includes(entry.name) && file !== boardBoundary) {
          assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /\b\w*Skeleton\b/, file);
        }
      }
    }
  }
  visit(path.join(root, 'src'));
});

test('board initial load uses the compact skeleton, cached posts stay visible, and errors remain visible', () => {
  let data;
  let error;
  const board = load('src\\components\\board\\cached-board.tsx', {
    react: { useEffect: () => {} },
    'react/jsx-runtime': runtime,
    swr: { __esModule: true, default: () => ({ data, error, mutate: async () => {} }) },
    '@/hooks/use-auth': { useAuth: () => ({ user: {
      userId: 'user', churchId: 'church', departmentId: 'department', role: 'cell_member',
    } }) },
    '@/lib/board-cache': load('src\\lib\\board-cache.ts'),
    '@/components/board/post-list': { PostList: 'PostList' },
    '@/components/board/board-skeleton': { BoardSkeleton: 'BoardSkeleton' },
  }).CachedBoard;
  let tree = board({ boardType: 'notice' });
  assert.equal(tree.props.children[1].type, 'BoardSkeleton');
  data = { posts: [{ id: 'post' }], villages: [], categories: [], villageMap: {}, hasMore: false, fetchedAt: Date.now() };
  tree = board({ boardType: 'notice' });
  assert.equal(tree.props.children[1].type, 'PostList');
  error = new Error('API unavailable');
  tree = board({ boardType: 'notice' });
  assert.equal(tree.props.children[0].props.role, 'alert');
  assert.equal(tree.props.children[1].type, 'PostList');
});

test('notification pending is not mistaken for an empty list and action progress is retained', () => {
  const list = load('src\\components\\notifications\\notification-list.tsx', {
    react: { useState: (value) => [value, () => {}], useEffect: () => {}, useCallback: (fn) => fn },
    'react/jsx-runtime': runtime,
    'next/link': 'Link', 'next/navigation': { useParams: () => ({ church: 'church', department: 'department' }) },
    'lucide-react': {},
    '@/lib/date-utils': { formatRelativeTime: () => '' }, '@/lib/utils': { cn: () => '' },
    '@/components/ui/page-pending': { PagePending: 'PagePending' },
  }).NotificationList;
  assert.equal(list({}).type, 'PagePending');
  const empty = list({ initialItems: [] });
  assert.equal(empty.props.children[1].props.children, '받은 알림이 없어요.');
  const button = fs.readFileSync(path.join(root, 'src', 'components', 'ui', 'button.tsx'), 'utf8');
  assert.match(button, /animate-spin/, 'save/upload action indicators must not be removed');
});

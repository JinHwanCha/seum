const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./helpers/load-source.cjs');

const user = {
  userId: 'user', churchId: 'church', departmentId: 'department', role: 'cell_member',
  cellId: 'cell', villageId: 'village', exp: 9999999999,
};
const groupCache = load('src\\lib\\small-group-cache.ts');

test('background preparation uses shared keys for prayer, structure and attendance without blocking render', () => {
  const keys = [];
  const warmer = load('src\\components\\prayer\\small-group-warmer.tsx', {
    react: { useEffect: () => {} },
    swr: { __esModule: true, default: (key, _fetcher, config) => {
      keys.push({ key, config });
      return {};
    } },
    '@/lib/small-group-cache': groupCache,
    '@/lib/date-utils': {},
    '@/components/prayer/use-week-prefetch': { useWeekPrefetch: () => () => {} },
  }).SmallGroupWarmer;
  assert.equal(warmer({ user, assignment: 'current', initialWeek: '2026-10-04', week: '2026-10-04' }), null);
  assert.equal(keys.length, 5);
  for (const [index, url] of [
    [0, '/api/small-group?weekStart=2026-10-04&mode=structure'],
    [1, '/api/small-group?weekStart=2026-10-04&mode=prayer'],
    [2, '/api/small-group?weekStart=2026-10-04&attendanceOnly=true'],
  ]) {
    assert.deepEqual(Array.from(keys[index].key), Array.from(groupCache.smallGroupCacheKey(user, url, 'current')));
    assert.equal(keys[index].config.revalidateOnFocus, false);
    assert.equal(keys[index].config.revalidateIfStale, false);
  }
  assert.equal(keys[3].key, null);
  assert.equal(keys[4].key, null);
});

test('tree preparation waits for current structure and only requests overview for oversight roles', () => {
  for (const role of ['cell_member', 'minister']) {
    const keys = [];
    const warmer = load('src\\components\\prayer\\small-group-warmer.tsx', {
      react: { useEffect: () => {} },
      swr: { __esModule: true, default: (key) => {
        keys.push(key);
        return { data: key?.[key.length - 1].includes('mode=structure') ? {
          currentUser: { cellId: 'cell', role },
          villageCells: [{ cells: [{ id: 'cell' }, { id: 'cell2' }] }],
        } : undefined };
      } },
      '@/lib/small-group-cache': groupCache,
      '@/lib/date-utils': {},
      '@/components/prayer/use-week-prefetch': { useWeekPrefetch: () => () => {} },
    }).SmallGroupWarmer;
    warmer({ user, assignment: 'current', initialWeek: '2026-10-04', week: '2026-10-04' });
    assert.equal(keys[3][keys[3].length - 1], '/api/small-group/tree?cellId=cell&monthStart=2026-10-01');
    if (role === 'minister') {
      assert.equal(keys[4][keys[4].length - 1], '/api/small-group/tree/summary?monthStart=2026-10-01&cellIds=cell,cell2');
    } else assert.equal(keys[4], null);
  }
});

test('sharing content paints before signaling background readiness and cleanup cancels pending frames', () => {
  let data;
  const frames = new Map();
  let next = 0;
  const effects = [];
  let ready = 0;
  const source = load('src\\components\\prayer\\sharing-sheet.tsx', {
    react: { useState: () => [false, () => {}], useEffect: (fn) => effects.push(fn) },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    swr: { __esModule: true, default: () => ({ data, isLoading: !data }) },
    '@/lib/date-utils': { getUpcomingSundayLabelKST: () => '2026.10.11' },
    '@/components/ui/modal': { Modal: 'Modal' },
    '@/components/prayer/sharing-sheet-editor': { SharingSheetEditor: 'Editor' },
    'lucide-react': {},
    '@/components/ui/page-pending': { PagePending: 'PagePending' },
  }, {}, {
    requestAnimationFrame: (fn) => { frames.set(++next, fn); return next; },
    cancelAnimationFrame: (id) => frames.delete(id),
  }).SharingSheet;
  const onReady = () => { ready++; };
  source({ onReady });
  effects.pop()();
  assert.equal(frames.size, 0, 'unfinished sharing request must not launch heavy queries');
  data = { content: { title: 'Ready', sections: [] } };
  source({ onReady });
  const cleanup = effects.pop()();
  assert.equal(ready, 0);
  frames.get(1)();
  assert.equal(ready, 0);
  frames.get(2)();
  assert.equal(ready, 1);
  cleanup();
  assert.equal(frames.size, 0);
});

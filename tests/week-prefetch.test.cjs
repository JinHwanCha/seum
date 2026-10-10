const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./helpers/load-source.cjs');

const user = { userId: 'me', churchId: 'church', departmentId: 'department', role: 'cell_member', exp: 9999999999 };
const groupCache = load('src\\lib\\small-group-cache.ts');
const sunday = new Date(2026, 9, 4);

test('week intent prefetch is bounded, deduplicated and uses the same active-tab cache keys', async () => {
  const cache = new Map();
  const requests = [];
  let release;
  const response = new Promise((resolve) => { release = resolve; });
  const hook = load('src\\components\\prayer\\use-week-prefetch.ts', {
    react: { useCallback: (fn) => fn },
    swr: {
      unstable_serialize: (key) => JSON.stringify(key),
      useSWRConfig: () => ({ cache, mutate: async (key, promise) => {
        const data = await promise;
        cache.set(JSON.stringify(key), { data });
      } }),
    },
    '@/hooks/use-auth': { useAuth: () => ({ user }) },
    '@/lib/date-utils': { formatWeekDate: () => '2026-10-04', isFutureWeek: (date) => date.getTime() > sunday.getTime() },
    '@/lib/small-group-cache': { ...groupCache, fetchSmallGroup: (key) => { requests.push(key); return response; } },
  }).useWeekPrefetch;
  const prepare = hook('assignment');
  prepare(sunday);
  prepare(sunday);
  hook('assignment')(sunday);
  assert.equal(requests.length, 2);
  assert.deepEqual(Array.from(requests[0]), Array.from(groupCache.smallGroupCacheKey(user, '/api/small-group?weekStart=2026-10-04&mode=prayer', 'assignment')));
  assert.deepEqual(Array.from(requests[1]), Array.from(groupCache.smallGroupCacheKey(user, '/api/small-group?weekStart=2026-10-04&attendanceOnly=true', 'assignment')));
  prepare(new Date(2026, 9, 11));
  assert.equal(requests.length, 2, 'future weeks never start a request');
  release({ fetchedAt: Date.now() });
  await new Promise(setImmediate);
  prepare(sunday);
  assert.equal(requests.length, 2, 'fresh historical data is reused');
});

test('week buttons start preparation on touch and change the selected date immediately', () => {
  const prepared = [];
  const changed = [];
  const previous = new Date(2026, 8, 27);
  const next = new Date(2026, 9, 11);
  const component = load('src\\components\\prayer\\week-selector.tsx', {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'lucide-react': {},
    '@/lib/date-utils': {
      getPreviousWeek: () => previous, getNextWeek: () => next,
      isFutureWeek: () => true, formatWeekLabel: () => 'current',
    },
  }).WeekSelector;
  const tree = component({ currentSunday: sunday, onPrepare: (date) => prepared.push(date), onChange: (date) => changed.push(date) });
  const previousButton = tree.props.children[0];
  previousButton.props.onTouchStart();
  assert.equal(prepared[0], previous);
  previousButton.props.onClick();
  assert.equal(changed[0], previous);
  const futureButton = tree.props.children[2];
  futureButton.props.onTouchStart();
  futureButton.props.onClick();
  assert.equal(changed.length, 1);
  assert.equal(prepared.length, 2);
});

test('background warming waits for selected week data and prepares previous two weeks plus next week', () => {
  let ready = false;
  const prepared = [];
  const date = new Date(2026, 9, 4);
  const warmer = load('src\\components\\prayer\\small-group-warmer.tsx', {
    react: { useEffect: (fn) => { fn(); } },
    swr: { __esModule: true, default: (key) => ({
      data: ready && key?.[key.length - 1].includes('weekStart=') ? {} : undefined,
    }) },
    '@/lib/small-group-cache': groupCache,
    '@/lib/date-utils': {
      getPreviousWeek: (week) => new Date(week.getFullYear(), week.getMonth(), week.getDate() - 7),
      getNextWeek: (week) => new Date(week.getFullYear(), week.getMonth(), week.getDate() + 7),
    },
    '@/components/prayer/use-week-prefetch': { useWeekPrefetch: () => (week) => prepared.push(week) },
    '@/components/prayer/tree-growth': {},
    '@/components/prayer/tree-overview': {},
    '@/components/attendance/special-worship-check': {},
  }).SmallGroupWarmer;
  warmer({ user, assignment: 'assignment', initialWeek: '2026-10-04', week: '2026-10-04' });
  assert.equal(prepared.length, 0);
  ready = true;
  warmer({ user, assignment: 'assignment', initialWeek: '2026-10-04', week: '2026-10-04' });
  assert.equal(prepared.length, 3);
  assert.equal(prepared[0].getTime(), new Date(2026, 8, 27).getTime());
  assert.equal(prepared[1].getTime(), new Date(2026, 8, 20).getTime());
  assert.ok(prepared[2] > date);
});

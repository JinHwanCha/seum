const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const load = require('./helpers/load-source.cjs');

const session = { userId: 'me', departmentId: 'dept', churchId: 'church', role: 'cell_member', cellId: 'old-cell', villageId: 'old-village', exp: 9999999999 };
const context = { villageName: 'Village', currentUser: {
  role: 'cell_member', cellId: 'cell', villageId: 'village', isNewFamilyTeam: false,
} };

test('prayer page renders client shell without waiting for unrelated group queries', async () => {
  const page = load('src\\app\\[church]\\[department]\\prayer\\page.tsx', {
    '@/lib/auth': { getSession: async () => session },
    'next/navigation': { redirect: () => { throw new Error('redirect'); } },
    './small-group-client': { __esModule: true, default: 'SmallGroupClient' },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
  }).default;
  const result = await page();
  assert.equal(result.type, 'SmallGroupClient');
  assert.equal(result.props.initialData, undefined);
});

test('initial sharing tab enables only small context query; heavy tabs use distinct query modes', () => {
  const filename = path.join(__dirname, '..', 'src', 'app', '[church]', '[department]', 'prayer', 'small-group-client.tsx');
  const source = fs.readFileSync(filename, 'utf8');
  const componentMocks = {};
  for (const match of source.matchAll(/import \{ ([^}]+) \} from '(@\/components\/[^']+)'/g)) {
    componentMocks[match[2]] = Object.fromEntries(match[1].split(',').map((name) => [name.trim(), name.trim()]));
  }
  let activeTab = 'sharing';
  const keys = [];
  const component = load('src\\app\\[church]\\[department]\\prayer\\small-group-client.tsx', {
    ...componentMocks,
    react: {
      useState: (value) => [value === 'sharing' ? activeTab : typeof value === 'function' ? value() : value, () => {}],
      useEffect: () => {}, useCallback: (fn) => fn, useMemo: (fn) => fn(), useRef: (value) => ({ current: value }),
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'next/dynamic': { __esModule: true, default: () => 'DynamicComponent' },
    '@/hooks/use-auth': { useAuth: () => ({ user: session }) },
    '@/lib/date-utils': { getCurrentWeekSunday: () => new Date('2026-10-04T00:00:00Z'), formatWeekDate: () => '2026-10-04' },
    '@/lib/constants': { ROLE_LABELS_DEFAULT: {} },
    '@/lib/utils': { birthYearTag: () => '' },
    '@/lib/small-group-cache': { smallGroupCacheKey: (_session, url) => [url], fetchSmallGroup: () => {} },
    '@/components/prayer/use-week-prefetch': { useWeekPrefetch: () => () => {} },
    'lucide-react': {},
    swr: { __esModule: true, default: (key) => {
      keys.push(key);
      return { data: key?.[0].includes('contextOnly') ? context : undefined, mutate: async () => {}, isLoading: false };
    } },
  }).default;
  component({});
  assert.ok(keys[0][0].includes('contextOnly'));
  assert.equal(keys[1], null);
  assert.equal(keys[2], null);
  keys.length = 0;
  activeTab = 'prayer';
  component({});
  assert.ok(keys[1][0].includes('mode=prayer'));
  assert.equal(keys[2], null);
  keys.length = 0;
  activeTab = 'attendance';
  component({});
  assert.ok(keys[1][0].includes('mode=structure'));
  assert.ok(keys[2][0].includes('attendanceOnly=true'));
  keys.length = 0;
  activeTab = 'tree';
  component({});
  assert.ok(keys[1][0].includes('mode=structure'));
  assert.equal(keys[2], null);
});

test('structure mode never executes prayers or attendance; prayer mode scopes the users and skips attendance', async () => {
  for (const options of [{ includePrayers: false, includeAttendance: false }, { includePrayers: true, includeAttendance: false }]) {
    const executed = [];
    const filters = [];
    const loader = load('src\\lib\\small-group-data.ts', {
      '@/lib/small-group-context': {
        getSmallGroupContext: async () => context,
        getSmallGroupUserIds: async () => ['me', 'peer'],
      },
      '@/lib/supabase': { createClient: () => ({
        from: (table) => {
          const query = {
            select: () => query, eq: () => query, order: () => query,
            in: (column, values) => { filters.push({ table, column, values }); return query; },
            single: () => query,
            then: (resolve, reject) => {
              executed.push(table);
              const data = table === 'cells' ? []
                : table === 'prayer_requests' ? [{ user_id: 'me', user: { name: 'Me', cell_id: 'cell' } }]
                : [];
              return Promise.resolve({ data }).then(resolve, reject);
            },
          };
          return query;
        },
      }) },
    });
    await loader.getSmallGroupData(session, '2026-10-04', options);
    assert.equal(executed.includes('attendance'), false);
    assert.equal(executed.includes('prayer_requests'), options.includePrayers);
    if (options.includePrayers) assert.ok(filters.some((filter) => filter.table === 'prayer_requests' && filter.values.includes('me')));
  }
});

test('fresh assignments require approval and clear stale JWT assignments rather than falling back', async () => {
  let approved = true;
  const loader = load('src\\lib\\small-group-context.ts', {
    '@/lib/supabase': { createClient: () => ({
      from: () => {
        const query = { select: () => query, eq: () => query,
          maybeSingle: async () => ({ data: { is_approved: approved, cell_id: null, village_id: null, role: 'cell_member' } }) };
        return query;
      },
    }) },
  });

  const fresh = await loader.getSmallGroupContext(session);
  assert.equal(fresh.currentUser.cellId, null);
  assert.equal(fresh.currentUser.villageId, null);
  approved = false;
  await assert.rejects(() => loader.getSmallGroupContext(session), /승인된/);
});

test('ordinary user query keeps their village, own cell and self; ministers retain full department scope', async () => {
    const filters = [];
    const loader = load('src\\lib\\small-group-context.ts', {
      '@/lib/supabase': { createClient: () => ({
        from: () => {
          const query = {
            select: () => query, eq: (key, value) => { filters.push({ key, value }); return query; },
            or: (value) => { filters.push({ or: value }); return query; },
            then: (resolve, reject) => Promise.resolve({ data: [{ id: 'peer' }] }).then(resolve, reject),
          };
          return query;
        },
      }) },
    });
    const ids = await loader.getSmallGroupUserIds(session, context);
    assert.ok(ids.includes('me'));
    assert.ok(ids.includes('peer'));
    assert.ok(filters.some((filter) => filter.key === 'department_id' && filter.value === 'dept'));
    assert.ok(filters.some((filter) => filter.or === 'village_id.eq.village,cell_id.eq.cell'));
    assert.equal(await loader.getSmallGroupUserIds(session, { ...context, currentUser: { ...context.currentUser, role: 'minister' } }), null);
  });

  test('small group API offers cheap context and scopes attendance with the latest assignments', async () => {
    const calls = [];
    const route = load('src\\app\\api\\small-group\\route.ts', {
      '@/lib/auth': { getSession: async () => session },
      '@/lib/small-group-context': {
        getSmallGroupContext: async () => context,
        getSmallGroupUserIds: async () => ['me', 'peer'],
      },
      '@/lib/small-group-data': { getSmallGroupData: async (_user, _week, options) => { calls.push(options); return { members: [] }; } },
      '@/lib/supabase': { createClient: () => ({
        from: () => {
          const query = {
            select: () => query, eq: () => query,
            in: (key, ids) => { calls.push({ key, ids }); return query; },
            then: (resolve, reject) => Promise.resolve({ data: [{ user_id: 'me' }] }).then(resolve, reject),
          };
          return query;
        },
      }) },
    });
    const cheap = await route.GET(new Request('https://seum.test/api/small-group?contextOnly=true'));
    assert.equal(cheap.status, 200);
    assert.equal(calls.length, 0);
    await route.GET(new Request('https://seum.test/api/small-group?weekStart=2026-10-04&mode=structure'));
    assert.equal(calls[0].includePrayers, false);
    assert.equal(calls[0].includeAttendance, false);
    const attendance = await route.GET(new Request('https://seum.test/api/small-group?weekStart=2026-10-04&attendanceOnly=true'));
    assert.equal(attendance.status, 200);
    assert.ok(calls.some((call) => call.key === 'user_id' && call.ids.includes('peer')));
    assert.equal((await route.GET(new Request('https://seum.test/api/small-group?weekStart=invalid'))).status, 400);
  });

test('group cache keys isolate users, assignments, week and mode and share duplicate requests', async () => {
  let count = 0;
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const cache = load('src\\lib\\small-group-cache.ts', { fetch: () => { count++; return pending; } });
  const first = cache.smallGroupCacheKey(session, '/api/small-group?weekStart=2026-10-04&mode=prayer', 'assignment');
  assert.notEqual(JSON.stringify(first), JSON.stringify(cache.smallGroupCacheKey({ ...session, userId: 'other' }, first[first.length - 1], 'assignment')));
  const one = cache.fetchSmallGroup(first);
  const two = cache.fetchSmallGroup([...first]);
  assert.equal(one, two);
  assert.equal(count, 1);
  finish(Response.json({ currentUser: context.currentUser }));
  await one;
});

test('board skeleton restores three rounded cards and respects reduced motion', () => {
  const skeleton = load('src\\components\\board\\board-skeleton.tsx', {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
  }).BoardSkeleton();
  assert.equal(skeleton.props.children[0].length, 3);
  assert.equal(skeleton.props['aria-busy'], 'true');
  assert.equal(skeleton.props.children[0][0].props.className.includes('h-20 rounded-xl'), true);
  assert.equal(skeleton.props.children[0][0].props.className.includes('motion-reduce:animate-none'), true);
});

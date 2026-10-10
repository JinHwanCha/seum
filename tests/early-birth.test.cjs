const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const loadSource = require('./helpers/load-source.cjs');

const utils = loadSource('src\\lib\\utils.ts');

test('early birth changes only the peer year, including century boundaries', () => {
  const birthday = '1995-01-03';
  assert.equal(`차진환${utils.birthYearTag(birthday)}`, '차진환 (95)');
  assert.equal(`차진환${utils.birthYearTag(birthday, true)}`, '차진환 (94)');
  assert.equal(utils.birthYearTag(birthday, false), ' (95)');
  assert.equal(birthday, '1995-01-03');
  assert.equal(utils.birthYearTag('2000-01-01', true), ' (99)');
  assert.equal(utils.birthYearTag('2001-02-01', true), ' (00)');
  assert.equal(utils.birthYearTag('1995-03-01', true), ' (94)');
  for (const value of [null, undefined, '', '19', 'invalid']) {
    assert.equal(utils.birthYearTag(value, true), '');
  }
});

test('checkbox is accessible and previews the requested name and year', () => {
  const { EarlyBirthCheckbox } = loadSource('src\\components\\auth\\early-birth-checkbox.tsx', {
    '@/lib/utils': utils,
  });
  for (const checked of [true, false]) {
    const html = renderToStaticMarkup(React.createElement(EarlyBirthCheckbox, {
      checked, onChange: () => {}, name: '차진환', birthDate: '1995-01-03',
    }));
    assert.match(html, /<label[^>]*><input[^>]*type="checkbox"/);
    assert.match(html, /빠른 년생/);
    assert.match(html, checked ? /차진환 \(94\)/ : /차진환 \(95\)/);
    assert.equal(html.includes('checked=""'), checked);
  }
});

const member = {
  id: 'member-a', name: '차진환', birth_date: '1995-01-03', is_early_birth: true,
  phone: '01012345678', village_id: null, cell_id: null,
};
const registration = {
  churchName: '교회', pastorName: '목사', name: member.name,
  birthDate: member.birth_date, phone: member.phone,
  departmentId: 'department-a', password: '1234',
};

function fixture(file, options = {}) {
  const calls = { inserts: [], updates: [], selects: [], filters: [], logs: [] };
  const supabase = {
    from(table) {
      let writing = false;
      const result = () => ({
        data: table === 'users'
          ? (writing ? null : options.samePhone || [])
          : [],
        error: writing ? options.saveError || null : null,
      });
      return {
        select(fields) { calls.selects.push([table, fields]); return this; },
        eq(key, value) { calls.filters.push([key, value]); return this; },
        insert(value) { calls.inserts.push(value); writing = true; return this; },
        update(value) { calls.updates.push(value); writing = true; return this; },
        async single() {
          return {
            data: table === 'users' ? member : { id: table === 'churches' ? 'church-a' : 'department-a' },
            error: null,
          };
        },
        then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
      };
    },
  };
  const route = loadSource(file, {
    '@/lib/supabase': { createClient: () => supabase },
    '@/lib/auth': {
      getSession: async () => options.unauthorized ? null : { userId: member.id },
      hashPassword: async () => 'hashed-password',
      verifyPassword: async () => true,
    },
    console: { error: (...args) => calls.logs.push(args) },
  });
  return {
    route, calls,
    submit(body) {
      const method = route.PATCH ? 'PATCH' : 'POST';
      return route[method](new Request('http://localhost/api/auth', {
        method, body: JSON.stringify(body),
      }));
    },
  };
}

const registerFile = 'src\\app\\api\\auth\\register\\route.ts';
const profileFile = 'src\\app\\api\\auth\\profile\\route.ts';

test('registration saves the checkbox separately without changing the birthday', async () => {
  for (const isEarlyBirth of [true, false, undefined]) {
    const { calls, submit } = fixture(registerFile);
    const response = await submit({ ...registration, isEarlyBirth });
    assert.equal(response.status, 200);
    assert.equal(calls.inserts.length, 1);
    assert.equal(calls.inserts[0].birth_date, '1995-01-03');
    assert.equal(calls.inserts[0].is_early_birth, isEarlyBirth ?? false);
    assert.equal(calls.inserts[0].requires_group_selection, true);
  }
});

test('changing early birth does not bypass duplicate registration checks', async () => {
  const { calls, submit } = fixture(registerFile, { samePhone: [member] });
  const response = await submit({ ...registration, isEarlyBirth: false });
  assert.equal(response.status, 409);
  assert.equal(calls.inserts.length, 0);
});

test('registration and profile reject non-boolean flags without writing', async () => {
  for (const file of [registerFile, profileFile]) {
    for (const isEarlyBirth of ['false', 'true', 0, 1, null, {}, []]) {
      const { calls, submit } = fixture(file);
      const response = await submit({ ...registration, isEarlyBirth });
      assert.equal(response.status, 400);
      assert.match((await response.json()).error, /빠른 년생/);
      assert.equal(calls.inserts.length + calls.updates.length, 0);
    }
  }
});

test('profile returns the persisted flag and actual birthday', async () => {
  const { route, calls } = fixture(profileFile);
  const response = await route.GET();
  assert.equal(response.status, 200);
  const { user } = await response.json();
  assert.equal(user.is_early_birth, true);
  assert.equal(user.birth_date, '1995-01-03');
  assert.ok(calls.selects[0][1].includes('is_early_birth'));
});

test('profile can toggle the flag on and off without altering birthday', async () => {
  for (const isEarlyBirth of [true, false]) {
    const { submit, calls } = fixture(profileFile);
    const response = await submit({ isEarlyBirth });
    assert.equal(response.status, 200);
    assert.equal(calls.updates[0].is_early_birth, isEarlyBirth);
    assert.equal(Object.hasOwn(calls.updates[0], 'birth_date'), false);
    assert.ok(calls.filters.some(([key, value]) => key === 'id' && value === member.id));
  }
});

test('profile saves birthday and flag together and preserves flag on legacy partial updates', async () => {
  const { submit, calls } = fixture(profileFile);
  assert.equal((await submit({ birthDate: '1995-01-03', isEarlyBirth: true })).status, 200);
  assert.equal(calls.updates[0].birth_date, '1995-01-03');
  assert.equal(calls.updates[0].is_early_birth, true);
  assert.equal((await submit({ phone: '01000000000' })).status, 200);
  assert.equal(Object.hasOwn(calls.updates[1], 'is_early_birth'), false);
});

test('failed writes surface an error and never report success', async () => {
  for (const file of [registerFile, profileFile]) {
    const { submit, calls } = fixture(file, { saveError: { message: 'database unavailable' } });
    const response = await submit({ ...registration, isEarlyBirth: true });
    assert.equal(response.status, 500);
    assert.ok((await response.json()).error);
    assert.equal(calls.logs.length, 1);
  }
});

test('unauthenticated users cannot update the checkbox', async () => {
  const { submit, calls } = fixture(profileFile, { unauthorized: true });
  assert.equal((await submit({ isEarlyBirth: true })).status, 401);
  assert.equal(calls.updates.length, 0);
});

test('migration adds a default-off column without modifying actual birthdays', () => {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', 'add_early_birth.sql'), 'utf8');
  assert.match(sql, /ALTER TABLE public\.users/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS is_early_birth BOOLEAN NOT NULL DEFAULT false/);
  assert.doesNotMatch(sql, /UPDATE\s|CREATE TABLE/i);
});

test('small group member, leader, prayer and current-user payloads retain early birth for every role', async () => {
  for (const role of ['cell_member', 'cell_leader', 'village_leader', 'minister']) {
    const me = { ...member, role, cell_id: 'cell-a', village_id: 'village-a' };
    const cellLeader = {
      ...me, id: 'leader-a', name: '목자', role: 'cell_leader',
      birth_date: '1997-01-01', is_early_birth: false,
    };
    const cell = { id: 'cell-a', name: '소그룹', village_id: 'village-a' };
    const village = { id: 'village-a', name: '마을', cells: [cell] };
    const tables = {
      users: [me, cellLeader],
      cells: [cell],
      villages: [village],
      group_years: [{ id: 'year-a', villages: [village] }],
      attendance: [],
      prayer_requests: [{ id: 'prayer-a', user_id: me.id, user: me }],
    };
    const queries = [];
    const project = (row, fields) => Object.fromEntries(
      fields.split(',').map((field) => [field.trim(), row[field.trim()]])
    );
    const { getSmallGroupData } = loadSource('src\\lib\\small-group-data.ts', {
      '@/lib/supabase': {
        createClient: () => ({
          from(table) {
            let fields;
            const result = () => {
              let data = tables[table];
              if (table === 'users') data = data.map((row) => project(row, fields));
              if (table === 'prayer_requests') {
                const userFields = fields.match(/user:users\(([^)]+)\)/)[1];
                data = data.map((row) => ({ ...row, user: project(row.user, userFields) }));
              }
              return { data, error: null };
            };
            return {
              select(value) { fields = value; queries.push([table, fields]); return this; },
              eq() { return this; },
              order() { return this; },
              async single() { return { data: result().data[0], error: null }; },
              then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
            };
          },
        }),
      },
    });
    const data = await getSmallGroupData({
      userId: me.id, departmentId: 'department-a', role,
      cellId: me.cell_id, villageId: me.village_id,
    }, '2026-10-04');
    assert.equal(data.currentUser.birth_date, me.birth_date);
    assert.equal(data.currentUser.is_early_birth, true);
    assert.equal(data.myPrayer.user.is_early_birth, true);
    assert.equal(data.prayers[0].user.is_early_birth, true);
    const villageMe = data.villageCells[0].cells[0].members.find((row) => row.id === me.id);
    assert.equal(villageMe.is_early_birth, true);
    assert.equal(villageMe.birth_date, me.birth_date);
    if (role === 'village_leader') {
      assert.equal(data.leader.id, me.id);
      assert.equal(data.leader.birth_date, me.birth_date);
      assert.equal(data.leader.is_early_birth, true);
    } else {
      assert.ok(data.members.some((row) => row.id === me.id && row.is_early_birth));
    }
    assert.ok(queries.filter(([table]) => table === 'users').every(([, fields]) => fields.includes('is_early_birth')));
  }
});

test('post and prayer cards render the persisted peer year, not the actual birth year', () => {
  const Badge = ({ children }) => React.createElement('span', null, children);
  const constants = { ROLE_LABELS_DEFAULT: { cell_member: '목원' }, MINISTER_RANK_LABELS: {} };
  const { PostCard } = loadSource('src\\components\\board\\post-card.tsx', {
    '@/lib/utils': utils,
    '@/lib/date-utils': { formatDateTime: () => 'date' },
    '@/components/ui/badge': { Badge },
    'next/navigation': { useParams: () => ({ church: 'church', department: 'department' }) },
    'next/link': { default: ({ children }) => React.createElement('a', null, children) },
  });
  const { PrayerCard } = loadSource('src\\components\\prayer\\prayer-card.tsx', {
    '@/lib/utils': utils,
    '@/lib/constants': constants,
    '@/lib/permissions': { canEditPrayer: () => false },
    '@/components/ui/badge': { Badge },
    '@/components/ui/image-lightbox': { ImageLightbox: () => null },
    './prayer-form': { PrayerForm: () => null },
  });
  for (const isEarlyBirth of [true, false]) {
    const user = { ...member, role: 'cell_member', is_early_birth: isEarlyBirth };
    const post = { id: 'post-a', title: '제목', content: '내용', author: user };
    const prayer = { id: 'prayer-a', content: '내용', user };
    const expected = isEarlyBirth ? /차진환 \(94\)/ : /차진환 \(95\)/;
    assert.match(renderToStaticMarkup(React.createElement(PostCard, { post, boardType: 'sharing' })), expected);
    assert.match(renderToStaticMarkup(React.createElement(PrayerCard, {
      prayer, session: { userId: member.id }, weekStart: '2026-10-04', onUpdated: () => {},
    })), expected);
  }
});

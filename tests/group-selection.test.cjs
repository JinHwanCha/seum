const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const { SignJWT } = require('jose');

function loadSource(relativePath, mocks = {}) {
  const filename = path.join(__dirname, '..', relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(source, {
    module: loaded,
    exports: loaded.exports,
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    console: { ...console, error: () => {} },
    process,
    TextEncoder,
    Headers,
    URL,
    Date,
  }, { filename });
  return loaded.exports;
}

const selection = loadSource('src\\lib\\group-selection.ts');
const villages = [
  { id: 'village-a', name: 'A', cells: [{ id: 'cell-a', name: 'A1' }] },
  { id: 'village-b', name: 'B', cells: [{ id: 'cell-b', name: 'B1' }] },
];

test('only newly registered members with incomplete assignments require selection', () => {
  for (const required of [true, false]) {
    for (const villageId of [null, 'village-a']) {
      for (const cellId of [null, 'cell-a']) {
        assert.equal(selection.needsGroupSelection({
          requires_group_selection: required,
          village_id: villageId,
          cell_id: cellId,
        }), required && (!villageId || !cellId));
      }
    }
  }
});

test('missing village and cell have the requested Korean validation messages', () => {
  for (const value of ['', '  ', null, undefined, 12, {}]) {
    assert.equal(selection.validateGroupSelection(villages, value, 'cell-a'), '마을을 선택해주세요.');
    assert.equal(selection.validateGroupSelection(villages, 'village-a', value), '소그룹을 선택해주세요.');
  }
});

test('only an existing cell in its selected village is accepted', () => {
  assert.equal(selection.validateGroupSelection(villages, 'village-a', 'cell-a'), null);
  for (const [options, villageId, cellId] of [
    [villages, 'village-a', 'cell-b'],
    [villages, 'another-department', 'cell-a'],
    [villages, 'village-a', 'deleted-cell'],
    [[], 'village-a', 'cell-a'],
  ]) {
    assert.match(selection.validateGroupSelection(options, villageId, cellId), /마을장이나 사역자에게 문의해주세요/);
  }
});

const session = {
  userId: 'user-a',
  churchId: 'church-a',
  departmentId: 'department-a',
  churchSlug: 'church',
  departmentSlug: 'department',
  villageId: null,
  cellId: null,
  requiresGroupSelection: true,
  exp: Math.floor(Date.now() / 1000) + 3600,
};

function routeFixture(options = {}) {
  const user = options.user || {
    is_approved: true,
    requires_group_selection: true,
    village_id: null,
    cell_id: null,
  };
  const calls = { updates: [], filters: [], token: null };
  const builder = {
    select() { return this; },
    eq(key, value) { calls.filters.push([key, value]); return this; },
    is(key, value) { calls.filters.push([key, value]); return this; },
    update(value) { calls.updates.push(value); return this; },
    async maybeSingle() {
      if (calls.updates.length) {
        return {
          data: options.conflict ? null : { id: 'user-a' },
          error: options.saveError || null,
        };
      }
      return { data: user, error: options.lookupError || null };
    },
  };
  const route = loadSource('src\\app\\api\\auth\\onboarding\\route.ts', {
    '@/lib/auth': {
      getSession: async () => Object.hasOwn(options, 'session') ? options.session : session,
      createToken: async (payload, expiry) => {
        calls.token = { payload, expiry };
        return 'updated-token';
      },
    },
    '@/lib/admin-data': {
      getVillagesWithCells: async () => {
        if (options.orgError) throw new Error('organization unavailable');
        return villages;
      },
    },
    '@/lib/constants': { COOKIE_NAME: 'test-session' },
    '@/lib/group-selection': selection,
    '@/lib/supabase': { createClient: () => ({ from: () => builder }) },
  });
  return {
    calls,
    submit: (body = { villageId: 'village-a', cellId: 'cell-a' }) => route.POST(
      new Request('http://localhost/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    ),
  };
}

test('saving persists both assignments, clears the requirement, and preserves login expiry', async () => {
  const fixture = routeFixture();
  const response = await fixture.submit();
  assert.equal(response.status, 200);
  assert.equal(fixture.calls.updates.length, 1);
  const update = fixture.calls.updates[0];
  assert.equal(update.village_id, 'village-a');
  assert.equal(update.cell_id, 'cell-a');
  assert.equal(update.requires_group_selection, false);
  assert.equal(fixture.calls.token.payload.requiresGroupSelection, false);
  assert.equal(fixture.calls.token.payload.villageId, 'village-a');
  assert.equal(fixture.calls.token.payload.cellId, 'cell-a');
  assert.equal(fixture.calls.token.expiry, session.exp);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  assert.match(response.headers.get('set-cookie'), /SameSite=lax/i);
  assert.ok(fixture.calls.filters.some(([key, value]) => key === 'church_id' && value === session.churchId));
  assert.ok(fixture.calls.filters.some(([key, value]) => key === 'department_id' && value === session.departmentId));
});

test('missing selection, foreign cells, malformed bodies, and unauthenticated users cannot save', async () => {
  for (const body of [
    { villageId: '', cellId: '' },
    { villageId: 'village-a', cellId: '' },
    { villageId: 'village-a', cellId: 'cell-b' },
    null,
  ]) {
    const fixture = routeFixture();
    assert.equal((await fixture.submit(body)).status, 400);
    assert.equal(fixture.calls.updates.length, 0);
    assert.equal(fixture.calls.token, null);
  }
  for (const [options, status] of [
    [{ session: null }, 401],
    [{ session: { ...session, requiresGroupSelection: false } }, 403],
    [{ session: { ...session, exp: 1 } }, 401],
    [{ user: { is_approved: false } }, 403],
  ]) {
    const fixture = routeFixture(options);
    assert.equal((await fixture.submit()).status, status);
    assert.equal(fixture.calls.updates.length, 0);
  }
});

test('administrator assignments are preserved even when an old onboarding session submits', async () => {
  const fixture = routeFixture({
    user: {
      is_approved: true,
      requires_group_selection: false,
      village_id: 'village-b',
      cell_id: 'cell-b',
    },
  });
  assert.equal((await fixture.submit()).status, 200);
  assert.equal(fixture.calls.updates.length, 0);
  assert.equal(fixture.calls.token.payload.villageId, 'village-b');
  assert.equal(fixture.calls.token.payload.cellId, 'cell-b');
});

test('concurrent assignment changes and database failures never issue a success session', async () => {
  for (const [options, status] of [
    [{ conflict: true }, 409],
    [{ lookupError: new Error('lookup failed') }, 500],
    [{ orgError: true }, 500],
    [{ saveError: new Error('save failed') }, 500],
  ]) {
    const fixture = routeFixture(options);
    const response = await fixture.submit();
    assert.equal(response.status, status);
    assert.equal(fixture.calls.token, null);
    assert.ok((await response.json()).error);
  }
});

test('middleware blocks direct navigation and APIs until selection; existing sessions keep working', async () => {
  const { middleware } = loadSource('src\\middleware.ts', {
    '@/lib/constants': { COOKIE_NAME: 'test-session' },
  });
  const key = new TextEncoder().encode(
    process.env.JWT_SECRET || 'seum-dev-secret-key-change-in-production-32ch'
  );
  async function request(pathname, required) {
    const token = await new SignJWT({ requiresGroupSelection: required })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1h')
      .sign(key);
    return middleware(new NextRequest(`http://localhost${pathname}`, {
      headers: { cookie: `test-session=${token}` },
    }));
  }
  for (const pathname of ['/', '/church/department', '/church/department/profile', '/church/department/admin']) {
    const response = await request(pathname, true);
    assert.equal(response.status, 307);
    assert.equal(response.headers.get('location'), 'http://localhost/onboarding');
  }
  for (const pathname of ['/api/posts', '/api/auth/profile', '/api/attendance']) {
    assert.equal((await request(pathname, true)).status, 403);
  }
  for (const pathname of ['/onboarding', '/api/auth/onboarding', '/api/auth/me', '/api/auth/logout']) {
    assert.equal((await request(pathname, true)).status, 200);
  }
  for (const required of [false, undefined]) {
    assert.equal((await request('/church/department', required)).status, 200);
    assert.equal((await request('/api/auth/profile', required)).status, 200);
  }
});

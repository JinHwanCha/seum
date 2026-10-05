const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { performance } = require('node:perf_hooks');
const { test } = require('node:test');
const ts = require('typescript');

function load(relative, mocks = {}) {
  const filename = path.join(__dirname, '..', relative);
  const loaded = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(code, {
    module: loaded, exports: loaded.exports,
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    console: mocks.console || console, fetch: mocks.fetch,
    Date, Map, Set, Error, SyntaxError, Request, Response,
  }, { filename });
  return loaded.exports;
}

const state = load('src\\lib\\reaction-state.ts');
const emoji = '👍';
const otherEmoji = '❤️';
const row = (user, symbol = emoji) => ({
  id: `${user}:${symbol}`, post_id: 'post', user_id: user, emoji: symbol, created_at: '2026-10-05',
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function componentFixture(initial = []) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  const requests = [];
  const errors = [];
  let refreshes = 0;
  const react = {
    useState: (value) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof value === 'function' ? value() : value;
      return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef: (value) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: value };
      return slots[index];
    },
    useEffect: (effect, deps) => {
      const index = cursor++;
      const previous = slots[index];
      if (!previous || deps.some((dep, i) => !Object.is(dep, previous[i]))) effects.push(effect);
      slots[index] = deps;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const component = load('src\\components\\board\\reaction-bar.tsx', {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/lib/constants': { EMOJIS: [emoji, otherEmoji] },
    '@/lib/utils': { cn: (...values) => values.join(' ') },
    '@/lib/reaction-state': state,
    console: { error: (...args) => errors.push(args) },
    fetch: (url, options) => {
      const response = deferred();
      requests.push({ url, options, response });
      return response.promise;
    },
  }).ReactionBar;
  const props = {
    postId: 'post', reactions: initial, session: { userId: 'me' },
    onRefresh: () => { refreshes++; },
  };
  function render() {
    cursor = 0;
    effects = [];
    const tree = component(props);
    effects.forEach((effect) => effect());
    return tree;
  }
  function nodes(tree = render()) {
    const result = [];
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(visit); return; }
      result.push(node);
      visit(node.props?.children);
    }
    visit(tree);
    return result;
  }
  function button(symbol) {
    return nodes().find((node) => node.type === 'button' && node.props['aria-label']?.startsWith(symbol));
  }
  function click(symbol) {
    let target = button(symbol);
    if (!target) {
      nodes().find((node) => node.type === 'button' && node.props.children === '+').props.onClick();
      target = button(symbol);
    }
    return target.props.onClick();
  }
  render();
  return { props, requests, errors, nodes, button, click, render, refreshes: () => refreshes };
}

test('a click updates membership and count within 100ms without waiting for the network', async () => {
  const fixture = componentFixture([row('other')]);
  const start = performance.now();
  const pending = fixture.click(emoji);
  assert.ok(performance.now() - start < 100);
  const button = fixture.button(emoji);
  assert.equal(button.props['aria-pressed'], true);
  assert.equal(button.props['aria-busy'], true);
  assert.equal(button.props.children[1].props.children, 2);
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.requests[0].options.method, 'POST');
  fixture.requests[0].response.resolve(Response.json({ success: true }));
  await pending;
  assert.equal(fixture.button(emoji).props['aria-busy'], false);
  assert.equal(fixture.refreshes(), 0);
  assert.equal(fixture.requests.length, 1);
});

test('removal is immediate, blocks duplicate clicks, and leaves other users intact', async () => {
  const fixture = componentFixture([row('me'), row('other')]);
  const pending = fixture.click(emoji);
  await fixture.click(emoji);
  assert.equal(fixture.requests.length, 1);
  assert.equal(fixture.requests[0].options.method, 'DELETE');
  assert.equal(fixture.button(emoji).props['aria-pressed'], false);
  assert.equal(fixture.button(emoji).props.children[1].props.children, 1);
  fixture.requests[0].response.resolve(Response.json({ success: true }));
  await pending;
});

test('HTTP and network failures restore state and show an explicit error', async () => {
  for (const failure of ['http', 'network', 'html']) {
    const fixture = componentFixture([row('me'), row('other')]);
    const pending = fixture.click(emoji);
    if (failure === 'network') fixture.requests[0].response.reject(new TypeError('Offline'));
    else if (failure === 'html') fixture.requests[0].response.resolve(new Response('<html>login</html>'));
    else fixture.requests[0].response.resolve(Response.json({ error: '저장 실패' }, { status: 500 }));
    await pending;
    assert.equal(fixture.button(emoji).props['aria-pressed'], true);
    assert.equal(fixture.button(emoji).props.children[1].props.children, 2);
    assert.ok(fixture.nodes().some((node) => node.props?.role === 'alert'));
    assert.equal(fixture.errors.length, 1);
    assert.equal(fixture.button(emoji).props['aria-busy'], false);
  }
});

test('different emojis can save concurrently and one rollback preserves the other success', async () => {
  const fixture = componentFixture([row('other')]);
  const first = fixture.click(emoji);
  const second = fixture.click(otherEmoji);
  assert.equal(fixture.requests.length, 2);
  fixture.requests[1].response.resolve(Response.json({ success: true }));
  await second;
  fixture.requests[0].response.resolve(Response.json({ error: 'Failed' }, { status: 500 }));
  await first;
  assert.equal(fixture.button(otherEmoji).props['aria-pressed'], true);
  assert.equal(fixture.button(emoji).props['aria-pressed'], false);
  assert.equal(fixture.refreshes(), 0);
});

test('incoming SSR props preserve pending changes and resync after completion', async () => {
  const fixture = componentFixture([row('other')]);
  const pending = fixture.click(emoji);
  fixture.props.reactions = [row('other'), row('new-user')];
  fixture.render();
  assert.equal(fixture.button(emoji).props.children[1].props.children, 3);
  fixture.requests[0].response.resolve(Response.json({ success: true }));
  await pending;
  fixture.props.reactions = [row('me'), row('other'), row('new-user')];
  fixture.render();
  assert.equal(fixture.button(emoji).props.children[1].props.children, 3);
});

function routeFixture({ session = { userId: 'me', name: 'Me' }, dbError = null, notificationError = null } = {}) {
  const calls = [];
  const logs = [];
  const notifications = [];
  const supabase = {
    from: (table) => {
      const query = {
        insert: async (data) => { calls.push({ table, data }); return { error: dbError }; },
        delete: () => { calls.push({ table, delete: true }); return query; },
        eq: (key, value) => { calls.push({ key, value }); return query; },
        then: (resolve, reject) => Promise.resolve({ error: dbError }).then(resolve, reject),
      };
      return query;
    },
  };
  const route = load('src\\app\\api\\posts\\[id]\\reactions\\route.ts', {
    '@/lib/auth': { getSession: async () => session },
    '@/lib/supabase': { createClient: () => supabase },
    '@/lib/constants': { EMOJIS: [emoji, otherEmoji] },
    '@/lib/notifications': { notifyPostAuthor: async (_, data) => {
      notifications.push(data);
      if (notificationError) throw notificationError;
    } },
    console: { error: (...args) => logs.push(args) },
  });
  const invoke = (method, body = JSON.stringify({ emoji })) => route[method](
    new Request('https://seum.test/api/posts/post/reactions', { method, body }),
    { params: { id: 'post' } }
  );
  return { invoke, calls, notifications, logs };
}

test('reaction API validates input and requires authentication before writing', async () => {
  for (const method of ['POST', 'DELETE']) {
    const unauthorized = routeFixture({ session: null });
    assert.equal((await unauthorized.invoke(method)).status, 401);
    assert.equal(unauthorized.calls.length, 0);
    for (const body of ['{', 'null', '{}', '{"emoji":12}', '{"emoji":"unsupported"}']) {
      const fixture = routeFixture();
      assert.equal((await fixture.invoke(method, body)).status, 400);
      assert.equal(fixture.calls.length, 0);
    }
  }
});

test('reaction insert preserves author notifications and duplicate inserts do not notify twice', async () => {
  const fixture = routeFixture();
  assert.equal((await fixture.invoke('POST')).status, 200);
  assert.equal(fixture.notifications.length, 1);
  assert.equal(fixture.notifications[0].snippet, emoji);
  const duplicate = routeFixture({ dbError: { code: '23505' } });
  assert.equal((await duplicate.invoke('POST')).status, 200);
  assert.equal(duplicate.notifications.length, 0);
});

test('DB failures never look successful; deleting targets only this user and emoji', async () => {
  for (const method of ['POST', 'DELETE']) {
    const fixture = routeFixture({ dbError: { code: 'DB_FAILURE' } });
    assert.equal((await fixture.invoke(method)).status, 500);
    assert.equal(fixture.logs.length, 1);
    assert.equal(fixture.notifications.length, 0);
  }
  const deletion = routeFixture();
  assert.equal((await deletion.invoke('DELETE')).status, 200);
  for (const [key, value] of [['post_id', 'post'], ['user_id', 'me'], ['emoji', emoji]]) {
    assert.ok(deletion.calls.some((call) => call.key === key && call.value === value));
  }
});

test('a notification failure is logged without falsely undoing a saved reaction', async () => {
  const fixture = routeFixture({ notificationError: new Error('Notification unavailable') });
  assert.equal((await fixture.invoke('POST')).status, 200);
  assert.equal(fixture.logs.length, 1);
  assert.match(fixture.logs[0][0], /Reaction saved but author notification failed/);
});

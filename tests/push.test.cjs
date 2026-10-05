const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { randomUUID } = require('node:crypto');
const { EventEmitter } = require('node:events');
const ts = require('typescript');

function load(file, mocks = {}, env = {}) {
  const filename = path.join(__dirname, '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(source, {
    module: loaded, exports: loaded.exports,
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    process: { env }, console: mocks.console || { error: () => {} },
    fetch: mocks.fetch, crypto: { randomUUID }, Request, Response, Headers,
    AbortSignal, AbortController, Buffer, URLSearchParams, Date, Error, SyntaxError, setTimeout, clearTimeout,
  }, { filename });
  return loaded.exports;
}
const validation = load('src\\lib\\push-validation.ts');
const userId = '11111111-1111-4111-8111-111111111111';
const installationId = '22222222-2222-4222-8222-222222222222';
const notificationId = '33333333-3333-4333-8333-333333333333';
const registration = {
  installationId, platform: 'android', provider: 'fcm', environment: 'production',
  token: 'a-valid-fcm-token-1234567890',
};
const testPem = ['-----BEGIN ' + 'PRIVATE KEY-----', 'TEST-ONLY-NOT-A-REAL-KEY', '-----END ' + 'PRIVATE KEY-----'].join('\n');

test('registration validates platform/provider/environment and rejects forged or malformed fields', () => {
  assert.ok(validation.parsePushRegistration(registration));
  assert.ok(validation.parsePushRegistration({
    ...registration, platform: 'ios', provider: 'apns', environment: 'sandbox', token: 'a'.repeat(64),
  }));
  for (const value of [null, {}, { ...registration, platform: 'web' },
    { ...registration, environment: 'sandbox' }, { ...registration, provider: 'apns' },
    { ...registration, token: 'tiny' }, { ...registration, token: 'x'.repeat(4097) },
    { ...registration, installationId: 'not-a-uuid' }]) assert.equal(validation.parsePushRegistration(value), null);
  assert.equal(validation.parsePushReference({ notificationId, recipientId: userId }).notificationId, notificationId);
  assert.equal(validation.parsePushReference({ notificationId, recipientId: 'invalid', url: '//evil.test' }), null);
});

function deviceFixture({ session = { userId, exp: Math.floor(Date.now() / 1000) + 3600 }, error = null } = {}) {
  const calls = [];
  const query = {
    update: (value) => { calls.push({ update: value }); return query; },
    eq: (key, value) => { calls.push({ key, value }); return query; },
    then: (resolve, reject) => Promise.resolve({ error }).then(resolve, reject),
  };
  const supabase = {
    rpc: async (name, args) => { calls.push({ name, args }); return { error }; },
    from: (name) => { calls.push({ table: name }); return query; },
  };
  const route = load('src\\app\\api\\push\\devices\\route.ts', {
    '@/lib/auth': { getSession: async () => session },
    '@/lib/supabase': { createClient: () => supabase },
    '@/lib/push-validation': validation,
  });
  return {
    calls,
    invoke: (method, body = registration) => route[method](new Request('https://seum.test/api/push/devices', {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })),
  };
}

test('device registration binds server session identity, not client-supplied user IDs', async () => {
  const fixture = deviceFixture();
  assert.equal((await fixture.invoke('POST', { ...registration, userId: 'attacker' })).status, 200);
  assert.equal(fixture.calls[0].args.p_user_id, userId);
  assert.equal(fixture.calls[0].args.p_provider, 'fcm');
  assert.equal(fixture.calls[0].args.p_installation_id, installationId);
});

test('device APIs reject anonymous, onboarding, expired sessions and DB failures', async () => {
  assert.equal((await deviceFixture({ session: null }).invoke('POST')).status, 401);
  assert.equal((await deviceFixture({ session: { userId, requiresGroupSelection: true } }).invoke('POST')).status, 403);
  assert.equal((await deviceFixture({ session: { userId, exp: 1 } }).invoke('POST')).status, 400);
  assert.equal((await deviceFixture().invoke('POST', null)).status, 400);
  assert.equal((await deviceFixture({ error: { code: 'MISSING_RPC' } }).invoke('POST')).status, 503);
  assert.equal((await deviceFixture({ error: { code: 'DB_ERROR' } }).invoke('DELETE', { installationId })).status, 503);
  const revoke = deviceFixture();
  assert.equal((await revoke.invoke('DELETE', { installationId })).status, 200);
  assert.ok(revoke.calls.some((call) => call.key === 'user_id' && call.value === userId));
  assert.ok(revoke.calls.some((call) => call.key === 'installation_id' && call.value === installationId));
});

test('native registration persists installation ID, serializes token updates and revokes on logout', async () => {
  const preferences = new Map();
  const calls = [];
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  const native = load('src\\lib\\native-push.ts', {
    '@capacitor/core': { Capacitor: {
      isNativePlatform: () => true, isPluginAvailable: () => true, getPlatform: () => 'android',
    } },
    '@capacitor/preferences': { Preferences: {
      get: async ({ key }) => ({ value: preferences.get(key) || null }),
      set: async ({ key, value }) => { preferences.set(key, value); },
      remove: async ({ key }) => { preferences.delete(key); },
    } },
    '@capacitor/push-notifications': { PushNotifications: {
      unregister: async () => { calls.push('unregister'); },
      removeAllDeliveredNotifications: async () => { calls.push('clear'); },
    } },
    '@/lib/push-validation': validation,
    fetch: async (_, options) => {
      calls.push(JSON.parse(options.body));
      await blocked;
      return Response.json({ success: true });
    },
  });
  const firstId = await native.getInstallationId();
  assert.equal(await native.getInstallationId(), firstId);
  const save = native.persistNativeToken(registration.token);
  await new Promise(setImmediate);
  let loggedOut = false;
  const logout = native.prepareNativeLogout().then((id) => { loggedOut = true; return id; });
  await new Promise(setImmediate);
  assert.equal(loggedOut, false, 'logout waits for any in-flight registration before revocation');
  assert.throws(() => native.allowNativeRegistration(), /로그아웃 또는 알림 해제 처리 중/);
  release();
  assert.equal(await save, true);
  assert.equal(await logout, firstId);
  assert.equal(await native.persistNativeToken('later-token-not-to-be-saved'), false);
  assert.equal(calls.length, 1);
  await native.finishNativeLogout();
  assert.equal(calls[1], 'unregister');
  assert.equal(calls[2], 'clear');
});

function senderFixture({ status = 200, response = { name: 'projects/test/messages/id' } } = {}) {
  const requests = [];
  class SignJWT {
    setProtectedHeader() { return this; }
    setIssuer() { return this; }
    setAudience() { return this; }
    setIssuedAt() { return this; }
    setExpirationTime() { return this; }
    async sign() { return 'signed-test-assertion'; }
  }
  const sender = load('src\\lib\\push-senders.ts', {
    jose: { SignJWT, importPKCS8: async () => 'test-key' },
    fetch: async (url, options) => {
      requests.push({ url, options });
      return url.includes('oauth2')
        ? Response.json({ access_token: 'test-access-token', expires_in: 3600 })
        : Response.json(response, { status });
    },
  }, { FIREBASE_PROJECT_ID: 'test', FIREBASE_CLIENT_EMAIL: 'test@example.invalid', FIREBASE_PRIVATE_KEY: testPem });
  return { sender, requests };
}

test('FCM sends a visible background notification, IDs, channel and deduplication tag', async () => {
  const fixture = senderFixture();
  assert.equal((await fixture.sender.sendNativePush(registration, { id: notificationId, recipientId: userId, title: '새 공지' })).outcome, 'sent');
  const payload = JSON.parse(fixture.requests[1].options.body).message;
  assert.equal(payload.token, registration.token);
  assert.equal(payload.data.notificationId, notificationId);
  assert.equal(payload.data.recipientId, userId);
  assert.equal(payload.android.notification.tag, notificationId);
  assert.equal(payload.android.notification.channel_id, 'seum-notifications');
  assert.equal(payload.notification.body, '세움에서 새 알림을 확인해주세요.');
  await fixture.sender.sendNativePush(registration, { id: notificationId, recipientId: userId, title: '새 공지' });
  assert.equal(fixture.requests.filter((request) => request.url.includes('oauth2')).length, 1);
});

test('provider errors invalidate only truly expired tokens and preserve tokens on payload/config errors', () => {
  const { sender } = senderFixture();
  assert.equal(sender.classifyFcm(404, 'UNREGISTERED').outcome, 'invalid');
  assert.equal(sender.classifyFcm(400, 'INVALID_ARGUMENT').outcome, 'failed');
  assert.equal(sender.classifyFcm(403, 'SENDER_ID_MISMATCH').outcome, 'failed');
  assert.equal(sender.classifyFcm(429, 'QUOTA_EXCEEDED').outcome, 'retry');
  assert.equal(sender.classifyApns(410, 'Unregistered').outcome, 'invalid');
  assert.equal(sender.classifyApns(400, 'BadDeviceToken').outcome, 'failed');
  assert.equal(sender.classifyApns(503, 'ServiceUnavailable').outcome, 'retry');
});

test('private key normalization handles real newlines, env escaping and copied JSON quotes without logging keys', () => {
  const { sender } = senderFixture();
  assert.equal(sender.normalizePrivateKey(testPem), testPem);
  assert.equal(sender.normalizePrivateKey(testPem.replaceAll('\n', '\\n')), testPem);
  assert.equal(sender.normalizePrivateKey(JSON.stringify(testPem)), testPem);
  assert.equal(sender.normalizePrivateKey(`'${testPem.replaceAll('\n', '\\n')}'`), testPem);
  assert.throws(() => sender.normalizePrivateKey('a-key-id'), /complete PKCS#8/);
  assert.throws(() => sender.normalizePrivateKey('{"private_key":"not-the-field-value"}'), /complete PKCS#8/);
  assert.throws(() => sender.normalizePrivateKey('"invalid json'), /JSON/);
});

test('APNs uses the correct environment, topic, visible alert and notification IDs', async () => {
  const captures = [];
  class SignJWT {
    setProtectedHeader() { return this; }
    setIssuer() { return this; }
    setIssuedAt() { return this; }
    async sign() { return 'test-apns-jwt'; }
  }
  const sender = load('src\\lib\\push-senders.ts', {
    jose: { SignJWT, importPKCS8: async () => 'test-key' },
    'node:http2': { connect: (host) => {
      const client = new EventEmitter();
      client.destroy = () => {};
      client.request = (headers) => {
        const stream = new EventEmitter();
        stream.setEncoding = () => {};
        stream.end = (body) => {
          captures.push({ host, headers, body: JSON.parse(body) });
          queueMicrotask(() => { stream.emit('response', { ':status': 200 }); stream.emit('end'); });
        };
        return stream;
      };
      return client;
    } },
  }, { APNS_PRIVATE_KEY: testPem, APNS_KEY_ID: 'KEY', APNS_TEAM_ID: 'TEAM' });
  assert.equal((await sender.sendNativePush({ provider: 'apns', environment: 'sandbox', token: 'a'.repeat(64) },
    { id: notificationId, recipientId: userId, title: '공지' })).outcome, 'sent');
  assert.equal(captures[0].host, 'https://api.sandbox.push.apple.com');
  assert.equal(captures[0].headers['apns-topic'], 'life.seum.app');
  assert.equal(captures[0].headers['apns-collapse-id'], notificationId);
  assert.equal(captures[0].body.notificationId, notificationId);
  assert.ok(captures[0].body.aps.alert);
});

test('dispatch endpoint requires its own server secret, not a login cookie', async () => {
  let calls = 0;
  const env = { PUSH_SEND_ENABLED: 'true', PUSH_DISPATCH_SECRET: 'x'.repeat(40) };
  const route = load('src\\app\\api\\push\\dispatch\\route.ts', {
    '@/lib/push-worker': { dispatchPushJobs: async () => { calls++; return { claimed: 0, results: [] }; } },
  }, env);
  assert.equal((await route.POST(new Request('https://seum.test/api/push/dispatch', { method: 'POST' }))).status, 401);
  assert.equal(calls, 0);
  assert.equal((await route.POST(new Request('https://seum.test/api/push/dispatch', {
    method: 'POST', headers: { Authorization: `Bearer ${env.PUSH_DISPATCH_SECRET}` },
  }))).status, 200);
  assert.equal(calls, 1);
  env.PUSH_SEND_ENABLED = 'false';
  assert.equal((await route.GET(new Request('https://seum.test/api/push/dispatch'))).status, 503);
});

test('worker cancels stale bindings and records send results using the claimed lease', async () => {
  for (const eligible of [true, false]) {
    const calls = [];
    let sends = 0;
    const notification = {
      id: notificationId, recipient_id: userId, department_id: 'dept', title: '공지', is_read: false,
      recipient: { is_approved: true, department_id: 'dept', role: 'cell_member', village_id: null },
      post: { department_id: 'dept', author_id: userId, visibility: 'all', village_id: null },
    };
    const device = { ...registration, id: 'device', user_id: userId, enabled: true,
      token_version: eligible ? 'version' : 'new-version',
      session_expires_at: new Date(Date.now() + 86400000).toISOString() };
    const supabase = {
      rpc: async (name, args) => {
        calls.push({ name, args });
        return name === 'claim_push_jobs'
          ? { data: [{ id: 'job', notification_id: notificationId, device_id: 'device', device_version: 'version', lease_id: 'lease' }] }
          : { data: true };
      },
      from: (table) => {
        const query = { select: () => query, eq: () => query,
          maybeSingle: async () => ({ data: table === 'push_devices' ? device : notification }) };
        return query;
      },
    };
    const worker = load('src\\lib\\push-worker.ts', {
      '@/lib/supabase': { createClient: () => supabase },
      '@/lib/push-senders': { sendNativePush: async () => { sends++; return { outcome: 'sent' }; } },
    });
    const result = await worker.dispatchPushJobs();
    assert.equal(sends, eligible ? 1 : 0);
    assert.equal(result.results[0].outcome, eligible ? 'sent' : 'cancelled');
    assert.equal(calls[1].args.p_lease_id, 'lease');
  }
});

function destinationFixture({ recipient = true, visibility = 'all', dbError = null } = {}) {
  const calls = [];
  const session = { userId, departmentId: 'dept', churchSlug: 'church', departmentSlug: 'department', role: 'cell_member' };
  const supabase = {
    from: (table) => {
      const query = {
        select: () => query,
        eq: (key, value) => { calls.push({ table, key, value }); return query; },
        update: () => { calls.push({ read: true }); return query; },
        maybeSingle: async () => ({ error: dbError, data: table === 'notifications'
          ? (recipient ? { id: notificationId, post_id: 'post', department_id: 'dept' } : null)
          : { id: 'post', slug: 'short-slug', board_type: 'notice', visibility, author_id: 'other', village_id: 'another-village' } }),
        then: (resolve, reject) => Promise.resolve({ error: dbError }).then(resolve, reject),
      };
      return query;
    },
  };
  const route = load('src\\app\\api\\push\\notifications\\[id]\\route.ts', {
    '@/lib/auth': { getSession: async () => session },
    '@/lib/supabase': { createClient: () => supabase },
    '@/lib/push-validation': validation,
  });
  return { calls, invoke: () => route.GET(new Request('https://seum.test'), { params: { id: notificationId } }) };
}

test('push click resolves only owned notifications and permitted tenant-scoped posts', async () => {
  const fixture = destinationFixture();
  const response = await fixture.invoke();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).href, '/church/department/boards/notice/short-slug');
  assert.ok(fixture.calls.some((call) => call.key === 'recipient_id' && call.value === userId));
  assert.ok(fixture.calls.some((call) => call.table === 'posts' && call.key === 'department_id'));
  assert.ok(fixture.calls.some((call) => call.read));
  assert.equal((await destinationFixture({ recipient: false }).invoke()).status, 404);
  assert.equal((await destinationFixture({ visibility: 'pastor' }).invoke()).status, 404);
  assert.equal((await destinationFixture({ visibility: 'village' }).invoke()).status, 404);
  assert.equal((await destinationFixture({ dbError: { code: 'DB_FAIL' } }).invoke()).status, 503);
});

test('logout revocation verifies the cookie independently of middleware headers', async () => {
  const calls = [];
  const query = {
    update: () => query,
    eq: (key, value) => { calls.push({ key, value }); return query; },
    then: (resolve, reject) => Promise.resolve({ error: null }).then(resolve, reject),
  };
  const route = load('src\\app\\api\\auth\\logout\\route.ts', {
    '@/lib/auth': {
      getCookieSession: async () => ({ userId }),
      getSession: async () => { throw new Error('Untrusted header fast path must not be used'); },
    },
    '@/lib/constants': { COOKIE_NAME: 'seum-token' },
    '@/lib/supabase': { createClient: () => ({ from: () => query }) },
    '@/lib/push-validation': validation,
  });
  const response = await route.POST(new Request('https://seum.test/api/auth/logout', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-session-payload': '{"userId":"attacker"}' },
    body: JSON.stringify({ installationId }),
  }));
  assert.equal(response.status, 200);
  assert.ok(calls.some((call) => call.key === 'user_id' && call.value === userId));
  assert.ok(response.headers.get('set-cookie').includes('seum-token='));
});

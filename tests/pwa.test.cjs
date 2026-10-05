const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function loadRegistrar(navigator, errors) {
  const filename = path.join(__dirname, '..', 'src', 'components', 'service-worker-registrar.tsx');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
    fileName: filename,
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(source, {
    module: loaded,
    exports: loaded.exports,
    require: (name) => {
      assert.equal(name, 'react');
      return { useEffect: (effect) => effect() };
    },
    navigator,
    console: { error: (...args) => errors.push(args) },
  }, { filename });
  return loaded.exports.ServiceWorkerRegistrar;
}

test('registrar registers the existing root service worker', async () => {
  const calls = [];
  const errors = [];
  const registrar = loadRegistrar({
    serviceWorker: {
      register: async (url) => { calls.push(url); },
    },
  }, errors);
  assert.equal(registrar(), null);
  await new Promise(setImmediate);
  assert.deepEqual(calls, ['/sw.js']);
  assert.deepEqual(errors, []);
});

test('registrar leaves unsupported browsers unchanged', () => {
  const errors = [];
  assert.equal(loadRegistrar({}, errors)(), null);
  assert.deepEqual(errors, []);
});

test('registrar reports the original registration failure', async () => {
  const failure = new Error('Registration denied');
  const errors = [];
  loadRegistrar({
    serviceWorker: { register: async () => { throw failure; } },
  }, errors)();
  await new Promise(setImmediate);
  assert.equal(errors.length, 1);
  assert.equal(errors[0][0], 'Service Worker registration failed:');
  assert.equal(errors[0][1], failure);
});

function loadWorker({ cached, fetch: fetchResponse } = {}) {
  const listeners = new Map();
  const operations = { opened: [], precached: [], fetched: [], written: [], skipped: 0 };
  const filename = path.join(__dirname, '..', 'public', 'sw.js');
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    self: {
      location: { origin: 'https://seum-nu.vercel.app' },
      addEventListener: (name, handler) => listeners.set(name, handler),
      skipWaiting: () => { operations.skipped++; },
    },
    URL,
    caches: {
      match: async (request) => {
        if (request === '/offline.html') return new Response('offline');
        return cached;
      },
      open: async (name) => {
        operations.opened.push(name);
        return {
          addAll: async (assets) => { operations.precached.push(...assets); },
          put: async (request, response) => { operations.written.push({ request, response }); },
        };
      },
    },
    fetch: async (request) => {
      operations.fetched.push(request);
      return fetchResponse ? fetchResponse(request) : new Response('network');
    },
  }, { filename });
  return {
    operations,
    install: async () => {
      let pending;
      listeners.get('install')({ waitUntil: (value) => { pending = value; } });
      await pending;
    },
    request: (pathname, options = {}) => {
      let response;
      const request = {
        url: new URL(pathname, 'https://seum-nu.vercel.app').href,
        method: 'GET',
        mode: 'cors',
        ...options,
      };
      listeners.get('fetch')({ request, respondWith: (value) => { response = value; } });
      return response;
    },
  };
}

test('worker precaches the existing offline page, manifest and icons', async () => {
  const worker = loadWorker();
  await worker.install();
  assert.deepEqual(worker.operations.opened, ['seum-static-v1']);
  assert.deepEqual(worker.operations.precached, [
    '/offline.html', '/manifest.webmanifest', '/pwa-icon-192', '/pwa-icon-512',
  ]);
  assert.equal(worker.operations.skipped, 1);
});

test('page navigation stays network-first and falls back only on network failure', async () => {
  const online = loadWorker();
  assert.equal(await (await online.request('/login', { mode: 'navigate' })).text(), 'network');

  const offline = loadWorker({ fetch: async () => { throw new TypeError('Offline'); } });
  assert.equal(await (await offline.request('/login', { mode: 'navigate' })).text(), 'offline');

  const serverError = loadWorker({ fetch: async () => new Response('server error', { status: 503 }) });
  assert.equal((await serverError.request('/login', { mode: 'navigate' })).status, 503);
});

test('worker does not intercept APIs, mutations, external origins or ordinary images', () => {
  const worker = loadWorker();
  for (const [url, options] of [
    ['/api/notifications', {}],
    ['/api/auth/login', { method: 'POST' }],
    ['/pwa-icon-192', { method: 'POST' }],
    ['https://example.com/image.png', {}],
    ['/image.png', {}],
  ]) {
    assert.equal(worker.request(url, options), undefined);
  }
  assert.deepEqual(worker.operations.fetched, []);
});

test('static cache hits do not issue network requests', async () => {
  for (const url of ['/_next/static/test.js', '/pwa-icon-192', '/pwa-icon-512', '/manifest.webmanifest']) {
    const worker = loadWorker({ cached: new Response('cached') });
    assert.equal(await (await worker.request(url)).text(), 'cached');
    assert.deepEqual(worker.operations.fetched, []);
  }
});

test('static cache misses cache successful responses but not server errors', async () => {
  for (const status of [200, 503]) {
    const worker = loadWorker({ fetch: async () => new Response('asset', { status }) });
    const response = await worker.request('/_next/static/test.js');
    await new Promise(setImmediate);
    assert.equal(response.status, status);
    assert.equal(worker.operations.fetched.length, 1);
    assert.equal(worker.operations.written.length, status === 200 ? 1 : 0);
    if (status === 200) {
      assert.equal(await worker.operations.written[0].response.text(), 'asset');
      assert.equal(await response.text(), 'asset');
    }
  }
});

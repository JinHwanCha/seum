const assert = require('node:assert/strict');
const { test } = require('node:test');
const { getDispatchUrl, rejectRedirect } = require('../scripts/push-dispatch.cjs');

test('dispatcher reports missing and short secrets separately without exposing their values', () => {
  assert.throws(() => getDispatchUrl(undefined, 'https://seum.test'), /is missing/);
  assert.throws(() => getDispatchUrl('x'.repeat(31), 'https://seum.test'), /at least 32/);
  assert.throws(() => getDispatchUrl('x'.repeat(32), undefined), /Set PUSH_SERVER_URL/);
  assert.equal(getDispatchUrl('x'.repeat(32), 'https://seum.test').href, 'https://seum.test/api/push/dispatch');
});

test('dispatcher rejects insecure remote URLs while allowing local development', () => {
  assert.throws(() => getDispatchUrl('x'.repeat(32), 'http://seum.test'), /require HTTPS/);
  assert.throws(() => getDispatchUrl('x'.repeat(32), 'invalid'), /valid absolute URL/);
  assert.equal(getDispatchUrl('x'.repeat(32), 'http://localhost:3000').protocol, 'http:');
});

test('dispatcher reports login redirects instead of silently following them to HTML', () => {
  const url = new URL('https://seum.test/api/push/dispatch');
  assert.throws(() => rejectRedirect(new Response(null, { status: 307, headers: { Location: '/login' } }), url), /redirected to \/login/);
  assert.throws(() => rejectRedirect(new Response(null, { status: 308, headers: { Location: 'https://www.seum.test/api/push/dispatch' } }), url), /canonical deployment/);
  assert.doesNotThrow(() => rejectRedirect(Response.json({ results: [] }), url));
});

const assert = require('node:assert/strict');
const { test } = require('node:test');
const load = require('./helpers/load-source.cjs');
const { pushImageUrl } = load('src\\lib\\push-image.ts');

test('Push image only accepts a usable first HTTPS image without a default brand fallback', () => {
  assert.equal(pushImageUrl('https://images.example/first.jpg'), 'https://images.example/first.jpg');
  for (const value of [null, undefined, '', 'invalid', 'data:image/png;base64,dGVzdA==', 'http://images.example/img.jpg', 'https://user:password@images.example/img.jpg']) {
    assert.equal(pushImageUrl(value), undefined);
  }
});

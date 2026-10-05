const assert = require('node:assert/strict');
const { test } = require('node:test');
const { selectDevice, androidEnvironment } = require('../scripts/android-preview.cjs');

test('selects one ready USB device or emulator', () => {
  for (const id of ['phone123', 'emulator-5554']) {
    assert.equal(selectDevice(`List of devices attached\r\n${id}\tdevice\r\n`), id);
  }
  assert.equal(selectDevice('List of devices attached\nblocked\tunauthorized\nphone\tdevice\n'), 'phone');
});

test('does not silently select a device when multiple are ready', () => {
  const devices = 'List of devices attached\nphone\tdevice\nemulator-5554\tdevice\n';
  assert.throws(() => selectDevice(devices), /Multiple devices/);
  assert.equal(selectDevice(devices, 'phone'), 'phone');
});

test('reports missing, offline and unauthorized devices before installing', () => {
  assert.throws(() => selectDevice('List of devices attached\n'), /No ready device/);
  assert.throws(() => selectDevice('phone\tunauthorized\n'), /unauthorized/);
  assert.throws(() => selectDevice('phone\toffline\n', 'phone'), /offline/);
  assert.throws(() => selectDevice('phone\tdevice\n', 'missing'), /not found/);
});

test('missing SDK setup produces an explicit actionable error', () => {
  assert.throws(() => androidEnvironment({ ANDROID_HOME: 'nonexistent-sdk' }), /Android SDK not found/);
});

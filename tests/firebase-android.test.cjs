const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('Google Services is declared once with the requested version', () => {
  const gradle = read('android', 'build.gradle');
  assert.equal((gradle.match(/com\.google\.gms:google-services:/g) || []).length, 1);
  assert.ok(gradle.includes("classpath 'com.google.gms:google-services:4.5.0'"));
});

test('FCM uses BoM-managed versions and does not introduce Analytics', () => {
  const gradle = read('android', 'app', 'build.gradle');
  assert.ok(gradle.includes("implementation platform('com.google.firebase:firebase-bom:34.19.0')"));
  assert.ok(gradle.includes("implementation 'com.google.firebase:firebase-messaging'"));
  assert.doesNotMatch(gradle, /firebase-messaging:/);
  assert.doesNotMatch(gradle, /firebase-analytics/);
});

test('Google Services is applied once without swallowing configuration failures', () => {
  const gradle = read('android', 'app', 'build.gradle');
  assert.equal((gradle.match(/apply plugin: 'com\.google\.gms\.google-services'/g) || []).length, 1);
  assert.ok(gradle.includes("if (file('google-services.json').exists())"));
  assert.doesNotMatch(gradle, /catch\s*\(Exception/);
  assert.match(gradle, /logger\.warn\('google-services\.json missing:/);
});

const configPath = path.join(root, 'android', 'app', 'google-services.json');
test('local Firebase configuration registers the selected Android application ID', {
  skip: !fs.existsSync(configPath) && 'google-services.json is local and intentionally not committed',
}, () => {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert.ok(config.client?.some((client) =>
    client.client_info?.android_client_info?.package_name === 'life.seum.app'
  ), 'Download the Firebase Android config for life.seum.app');
});

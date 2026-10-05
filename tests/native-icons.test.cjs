const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const root = path.join(__dirname, '..');

function dimensions(...parts) {
  const data = fs.readFileSync(path.join(root, ...parts));
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

test('brand master and iOS app icon are 1024 square PNGs', () => {
  assert.deepEqual(dimensions('assets', 'native', 'seum-icon.png'), [1024, 1024]);
  assert.deepEqual(dimensions('ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png'), [1024, 1024]);
});

test('all Android densities have correctly sized legacy and adaptive brand artwork', () => {
  for (const [density, legacy, adaptive] of [
    ['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216],
    ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432],
  ]) {
    const dir = ['android', 'app', 'src', 'main', 'res', `mipmap-${density}`];
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
      assert.deepEqual(dimensions(...dir, name), [legacy, legacy]);
    }
    for (const name of ['ic_launcher_foreground.png', 'ic_launcher_background.png']) {
      assert.deepEqual(dimensions(...dir, name), [adaptive, adaptive]);
    }
  }
});

test('both adaptive icons use the branded gradient and foreground', () => {
  for (const name of ['ic_launcher.xml', 'ic_launcher_round.xml']) {
    const xml = fs.readFileSync(path.join(root, 'android', 'app', 'src', 'main', 'res', 'mipmap-anydpi-v26', name), 'utf8');
    assert.match(xml, /background android:drawable="@mipmap\/ic_launcher_background"/);
    assert.match(xml, /foreground android:drawable="@mipmap\/ic_launcher_foreground"/);
  }
});

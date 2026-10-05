const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

function loadConfig() {
  const source = ts.transpileModule(read('capacitor.config.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(source, { module: loaded, exports: loaded.exports });
  return loaded.exports.default;
}

test('preview uses the canonical HTTPS web service without extra bridge origins', () => {
  const config = loadConfig();
  assert.equal(config.appId, 'life.seum.app');
  assert.equal(config.appName, '세움');
  assert.equal(config.server.url, 'https://seum-nu.vercel.app');
  assert.equal(config.server.cleartext, false);
  assert.equal(config.android.allowMixedContent, false);
  assert.equal(config.server.allowNavigation, undefined);
  assert.equal(config.webDir, 'mobile-web');
  assert.ok(fs.existsSync(path.join(root, config.webDir, 'index.html')));
});

test('native identifiers and initial versions match the selected app identity', () => {
  const android = read('android', 'app', 'build.gradle');
  const ios = read('ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  const version = JSON.parse(read('package.json')).version;
  assert.match(android, /namespace "life\.seum\.app"/);
  assert.match(android, /applicationId "life\.seum\.app"/);
  assert.ok(android.includes(`versionName "${version}"`));
  assert.match(android, /versionCode 1\b/);
  assert.equal((ios.match(/PRODUCT_BUNDLE_IDENTIFIER = life\.seum\.app;/g) || []).length, 2);
  assert.equal((ios.match(/CURRENT_PROJECT_VERSION = 1;/g) || []).length, 2);
  assert.equal(ios.split(`MARKETING_VERSION = ${version};`).length - 1, 2);
});

test('iOS Swift package matches the installed Capacitor version exactly', () => {
  const version = JSON.parse(read('package.json')).dependencies['@capacitor/ios'];
  const swift = read('ios', 'App', 'CapApp-SPM', 'Package.swift');
  assert.ok(swift.includes(`exact: "${version}"`));
  assert.match(read('ios', 'App', 'App.xcodeproj', 'project.pbxproj'), /XCLocalSwiftPackageReference/);
});

test('preview includes native Release and Archive distribution guards', () => {
  const android = read('android', 'app', 'build.gradle');
  assert.match(android, /gradle\.taskGraph\.whenReady/);
  assert.match(android, /contains\('release'\)/);
  assert.match(android, /throw new GradleException\('SEUM preview only:/);
  const ios = read('ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  assert.match(ios, /buildPhases = \(\s+7E0010010000000000000001/);
  assert.match(ios, /isa = PBXShellScriptBuildPhase/);
  assert.ok(ios.includes('$CONFIGURATION\\" != \\"Debug'));
  assert.ok(ios.includes('$ACTION\\" = \\"install'));
  assert.ok(ios.includes('exit 1'));
});

const shell = process.platform === 'win32'
  ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'usr', 'bin', 'sh.exe')
  : '/bin/sh';

test('iOS guard allows Debug runs and rejects Release and Archive actions', {
  skip: !fs.existsSync(shell) && 'A POSIX shell is required to execute the Xcode build guard',
}, () => {
  const project = read('ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  const match = project.match(/shellScript = ("(?:[^"\\]|\\.)*");/);
  assert.ok(match);
  const script = JSON.parse(match[1]);
  for (const [configuration, action, status] of [
    ['Debug', 'build', 0],
    ['Release', 'build', 1],
    ['Release', 'install', 1],
    ['Debug', 'install', 1],
  ]) {
    const result = spawnSync(shell, ['-c', script], {
      env: { ...process.env, CONFIGURATION: configuration, ACTION: action },
      encoding: 'utf8',
    });
    assert.ifError(result.error);
    assert.equal(result.status, status, `${configuration}/${action}: ${result.stderr}`);
    if (status === 1) assert.match(result.stdout, /error: SEUM preview only:/);
  }
});

test('machine-local files and signing credentials are excluded from version control', () => {
  const ignore = read('.gitignore');
  for (const entry of [
    'android/local.properties', '*.keystore', '*.jks', '*.p12', '*.p8',
    '*.mobileprovision', 'android/app/google-services.json', 'ios/App/App/GoogleService-Info.plist',
  ]) {
    assert.ok(ignore.split(/\r?\n/).includes(entry), entry);
  }
});

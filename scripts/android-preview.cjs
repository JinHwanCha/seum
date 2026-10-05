const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');

function selectDevice(output, serial) {
  const devices = output.split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter((parts) => parts.length >= 2 && ['device', 'unauthorized', 'offline'].includes(parts[1]))
    .map(([id, state]) => ({ id, state }));
  if (serial) {
    const device = devices.find((item) => item.id === serial);
    if (!device) throw new Error(`Device ${serial} not found. Check USB debugging and adb devices.`);
    if (device.state !== 'device') throw new Error(`Device ${serial} is ${device.state}. Approve USB debugging or reconnect.`);
    return device.id;
  }
  const ready = devices.filter((device) => device.state === 'device');
  if (ready.length > 1) throw new Error('Multiple devices connected. Use npm run mobile:android:install -- --serial DEVICE_ID');
  if (ready.length === 1) return ready[0].id;
  throw new Error(`No ready device. Connect your phone, enable USB debugging and approve the prompt, or start an emulator. Detected states: ${devices.map((d) => d.state).join(', ') || 'none'}`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: options.capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} failed (exit ${result.status}, signal ${result.signal || 'none'}).${options.capture ? `\n${result.stdout || ''}${result.stderr || ''}` : ''}`);
  }
  return result.stdout;
}

function androidEnvironment(env) {
  const sdkCandidates = [
    env.ANDROID_HOME,
    env.ANDROID_SDK_ROOT,
    env.LOCALAPPDATA && path.join(env.LOCALAPPDATA, 'Android', 'Sdk'),
  ].filter(Boolean);
  const sdk = sdkCandidates.find((dir) => fs.existsSync(path.join(dir, 'platform-tools', 'adb.exe')));
  if (!sdk) throw new Error('Android SDK not found. Install it in Android Studio, then set ANDROID_HOME to its location.');
  const javaCandidates = [
    env.JAVA_HOME,
    path.join(env.ProgramFiles || 'C:\\Program Files', 'Android', 'Android Studio', 'jbr'),
  ].filter(Boolean);
  const java = javaCandidates.find((dir) => fs.existsSync(path.join(dir, 'bin', 'java.exe')));
  if (!java) throw new Error('JDK not found. Install Android Studio with JDK 21 or set JAVA_HOME to JDK 21.');
  return { ...env, JAVA_HOME: java, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk };
}

function main(args) {
  if (process.platform !== 'win32') throw new Error('This helper is for Windows. On macOS/Linux, use Android Studio or the Gradle Wrapper directly.');
  const [action, ...options] = args;
  if (!['build', 'install'].includes(action) ||
      (options.length !== 0 && !(action === 'install' && options.length === 2 && options[0] === '--serial' && options[1]))) {
    throw new Error('Usage: npm run mobile:android:debug OR npm run mobile:android:install -- [--serial DEVICE_ID]');
  }
  const env = androidEnvironment(process.env);
  const adb = path.join(env.ANDROID_HOME, 'platform-tools', 'adb.exe');
  const serial = action === 'install' ? selectDevice(run(adb, ['devices'], { env, capture: true }), options[1]) : null;
  const cli = path.join(root, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor');
  if (!fs.existsSync(cli)) throw new Error('Capacitor CLI missing. Run npm ci first.');
  run(process.execPath, [cli, 'sync', 'android'], { env });
  const config = JSON.parse(fs.readFileSync(path.join(root, 'android', 'app', 'src', 'main', 'assets', 'capacitor.config.json'), 'utf8'));
  console.log(`Building Debug preview for ${config.server.url}`);
  run(env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'gradlew.bat --no-daemon assembleDebug'], {
    env,
    cwd: path.join(root, 'android'),
  });
  const original = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  const artifactDir = path.join(root, 'mobile-artifacts', 'android');
  fs.mkdirSync(artifactDir, { recursive: true });
  const apk = path.join(artifactDir, 'seum-debug.apk');
  fs.copyFileSync(original, apk);
  console.log(`Debug APK ready: ${apk}`);
  console.log('Preview only. Push requires the deployed web/API, database migration and server credentials. Do not upload this APK to a store.');
  if (action === 'install') {
    run(adb, ['-s', serial, 'install', '-r', apk], { env });
    run(adb, ['-s', serial, 'shell', 'am', 'start', '-W', '-n', `${config.appId}/.MainActivity`], { env });
    console.log('Installation and launch command completed. Check the phone screen and test login.');
  }
}

module.exports = { selectDevice, androidEnvironment };

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error('Android preview failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

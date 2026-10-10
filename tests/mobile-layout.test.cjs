const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const load = require('./helpers/load-source.cjs');

const themes = load('src\\lib\\themes.ts');
const read = (...parts) => fs.readFileSync(path.join(__dirname, '..', ...parts), 'utf8');

test('all native themes choose readable icons and apply matching Android backgrounds', async () => {
  for (const theme of themes.THEMES) {
    const effects = [];
    const calls = [];
    const properties = [];
    const component = load('src\\components\\theme\\native-system-bars.tsx', {
      react: {
        useEffect: (fn) => effects.push(fn),
        useState: () => [null, () => {}],
        useRef: (value) => ({ current: value }),
      },
      'react/jsx-runtime': { jsx: () => null, jsxs: () => null },
      '@capacitor/core': {
        Capacitor: { isNativePlatform: () => true, isPluginAvailable: () => true, getPlatform: () => 'android' },
        registerPlugin: () => ({ apply: async (options) => calls.push(options) }),
      },
      '@capacitor/status-bar': { StatusBar: { setStyle: async (options) => calls.push(options) }, Style: { Dark: 'DARK', Light: 'LIGHT' } },
      '@/lib/themes': themes,
      '@/components/theme/theme-provider': { useTheme: () => ({ theme: theme.id }) },
    }, {}, {
      document: {
        documentElement: { style: { setProperty: (key, value) => properties.push([key, value]) } },
        addEventListener: () => {}, removeEventListener: () => {},
      },
    }).NativeSystemBars;
    component();
    const cleanup = effects[0]();
    await new Promise(setImmediate);
    assert.equal(calls[0].style, theme.group === 'dark' ? 'DARK' : 'LIGHT');
    assert.equal(calls[1].color, themes.THEME_PAGE_BG[theme.id]);
    assert.equal(calls[1].dark, theme.group === 'dark');
    assert.deepEqual(properties, [['--seum-safe-top', '0px'], ['--seum-safe-bottom', '0px']]);
    cleanup();
  }
});

test('browser and iOS keep CSS Safe Areas and browser never calls a native plugin', async () => {
  for (const platform of ['web', 'ios']) {
    const effects = [];
    const properties = [];
    let nativeCalls = 0;
    const component = load('src\\components\\theme\\native-system-bars.tsx', {
      react: { useEffect: (fn) => effects.push(fn), useState: () => [null, () => {}], useRef: (value) => ({ current: value }) },
      'react/jsx-runtime': { jsx: () => null },
      '@capacitor/core': {
        Capacitor: { isNativePlatform: () => platform !== 'web', isPluginAvailable: () => true, getPlatform: () => platform },
        registerPlugin: () => ({ apply: async () => { throw new Error('Android plugin must not run'); } }),
      },
      '@capacitor/status-bar': { StatusBar: { setStyle: async () => { nativeCalls++; } }, Style: { Dark: 'DARK', Light: 'LIGHT' } },
      '@/lib/themes': themes, '@/components/theme/theme-provider': { useTheme: () => ({ theme: 'dark' }) },
    }, {}, {
      document: { documentElement: { style: { setProperty: (...args) => properties.push(args) } }, addEventListener: () => {}, removeEventListener: () => {} },
    }).NativeSystemBars;
    component();
    effects[0]();
    await new Promise(setImmediate);
    assert.equal(nativeCalls, platform === 'ios' ? 1 : 0);
    assert.deepEqual(properties, []);
  }
});

test('bottom content reserves menu plus safe area and native plugin is registered', () => {
  const css = read('src', 'app', 'globals.css');
  assert.ok(css.includes('padding-bottom: calc(5rem + var(--seum-safe-bottom, env(safe-area-inset-bottom, 0px)))'));
  const layout = read('src', 'app', '[church]', '[department]', 'layout.tsx');
  assert.ok(layout.includes('mobile-content min-w-0'));
  assert.ok(!layout.includes('sm:p-6'), 'shorthand padding must not overwrite mobile bottom clearance');
  const activity = read('android', 'app', 'src', 'main', 'java', 'life', 'seum', 'app', 'MainActivity.java');
  assert.ok(activity.includes('registerPlugin(SeumSystemBarsPlugin.class)'));
  assert.ok(activity.includes('WindowCompat.setDecorFitsSystemWindows(getWindow(), false)'));
});

test('each primary data route has a loading boundary for shell prefetch', () => {
  for (const route of ['profile', 'notifications', 'bible', 'prayer', 'admin', path.join('boards', '[type]')]) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'src', 'app', '[church]', '[department]', route, 'loading.tsx')));
  }
  const main = read('src', 'app', '[church]', '[department]', 'page.tsx');
  assert.ok(main.includes('<WorshipGuide />'));
  assert.ok(main.includes('<GatheringBoard />'));
  assert.ok(!main.includes('await Promise.all('));
});

test('navigation handles ordinary internal taps but preserves modified and external links', () => {
  const destinations = [];
  const router = { push: (href) => destinations.push(href), replace: (href) => destinations.push(`replace:${href}`) };
  let context;
  const jsx = (type, props) => ({ type, props });
  const exports = load('src\\components\\layout\\navigation-provider.tsx', {
    react: {
      createContext: () => ({ Provider: 'context' }), useContext: () => context,
      useTransition: () => [true, (fn) => fn()],
    },
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': 'Link',
    'next/navigation': { useRouter: () => router },
    '@/components/board/use-board-prefetch': { useBoardPrefetch: () => () => {} },
  }, {}, { window: { location: { pathname: '/current', search: '', hash: '' } } });
  context = exports.NavigationProvider({ children: null }).props.value;
  assert.equal(exports.NavigationProvider({ children: 'page' }).props.children, 'page', 'navigation must not add a flashing progress banner');
  const click = (props, options = {}) => {
    let prevented = false;
    exports.NavigationLink(props).props.onClick({
      button: 0, defaultPrevented: false, ...options,
      preventDefault: () => { prevented = true; },
    });
    return prevented;
  };
  assert.equal(click({ href: '/notice' }), true);
  assert.equal(click({ href: '/prayer', replace: true }), true);
  assert.deepEqual(destinations, ['/notice', 'replace:/prayer']);
  assert.equal(click({ href: '/notice' }, { ctrlKey: true }), false);
  assert.equal(click({ href: 'https://example.com' }), false);
  assert.equal(click({ href: '//example.com' }), false);
  assert.equal(click({ href: '/file', download: true }), false);
});

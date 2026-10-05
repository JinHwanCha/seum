const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');

module.exports = function loadSource(file, mocks = {}, env = {}, globals = {}) {
  const filename = path.join(__dirname, '..', '..', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(source, {
    module: loaded, exports: loaded.exports,
    require: (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    process: { env }, console: mocks.console || { error: () => {} },
    fetch: mocks.fetch, crypto: { randomUUID }, Request, Response, Headers,
    AbortSignal, AbortController, Buffer, URL, URLSearchParams, Date, Error, SyntaxError,
    setTimeout, clearTimeout, Event, ...globals,
  }, { filename });
  return loaded.exports;
};

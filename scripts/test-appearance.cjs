const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function fixture({ saved = null, readFails = false, writeFails = false, write } = {}) {
  const storage = { value: saved, writes: 0 };
  const source = ts.transpileModule(readFileSync(path.join(__dirname, '../src/stores/appearance.store.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const secure = {
    getItemAsync: async () => { if (readFails) throw Error('Read failed'); return storage.value; },
    setItemAsync: async (_, value) => {
      storage.writes++;
      if (writeFails) throw Error('Write failed');
      if (write) await write();
      storage.value = value;
    },
  };
  const localRequire = name => name === '@/lib/secure-store' ? { SecureStore: secure }
    : name === '@/lib/logger' ? { logger: { warn() {} } } : require(name);
  vm.runInThisContext('(function(require,module,exports){' + source + '\n})')(localRequire, module, module.exports);
  return { store: module.exports.useAppearance, storage };
}

test('restores the saved theme; unknown saved values fall back to device theme', async () => {
  for (const [saved, expected] of [['dark', 'dark'], ['light', 'light'], ['invalid', 'system'], [null, 'system']]) {
    const { store } = fixture({ saved });
    await store.getState().hydrate();
    assert.equal(store.getState().preference, expected);
    assert.equal(store.getState().hydrated, true);
  }
});
test('a failed read allows recovery through an explicit selection', async () => {
  const { store, storage } = fixture({ readFails: true });
  await store.getState().hydrate();
  assert.ok(store.getState().error);
  await store.getState().choose('dark');
  assert.equal(store.getState().error, null);
  assert.equal(storage.value, 'dark');
});
test('a failed save preserves the previously restored theme', async () => {
  const { store } = fixture({ saved: 'dark', writeFails: true });
  await store.getState().hydrate();
  await store.getState().choose('light');
  assert.equal(store.getState().preference, 'dark');
  assert.equal(store.getState().saving, false);
  assert.ok(store.getState().error);
});
test('ignores selection before hydration and while a save is in progress', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const { store, storage } = fixture({ write: () => pending });
  await store.getState().choose('light');
  assert.equal(storage.writes, 0);
  await store.getState().hydrate();
  const save = store.getState().choose('dark');
  await store.getState().choose('light');
  assert.equal(storage.writes, 1);
  release(); await save;
  assert.equal(store.getState().preference, 'dark');
});

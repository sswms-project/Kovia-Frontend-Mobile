const assert = require('node:assert/strict');
const { Buffer } = require('node:buffer');
const { createHash, randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.dirname(require.resolve('../package.json'));
class ApiError extends Error { constructor(message, statusCode) { super(message); this.statusCode = statusCode; } }
function fixture() {
  const values = new Map(); let rejectWrite = () => false;
  const secure = { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1, isAvailableAsync: async () => true,
    getItemAsync: async key => values.get(key) ?? null, deleteItemAsync: async key => { values.delete(key); },
    setItemAsync: async (key, value) => { if (rejectWrite(key, value)) throw Error('Storage unavailable'); values.set(key, value); } };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const module = { exports: {} }; cache.set(filename, module.exports);
    const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const localRequire = name => {
      if (name === 'expo-secure-store') return secure;
      if (name === 'expo-crypto') return { CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_, value) => createHash('sha256').update(value).digest('hex') };
      if (name === './api') return { ApiError };
      if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts');
      if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts')));
      return require(name);
    };
    vm.runInThisContext('(function(require,module,exports){' + source + '\n})', { filename })(localRequire, module, module.exports);
    return module.exports;
  }
  return { load, values, reject: callback => { rejectWrite = callback; } };
}
const draft = (scope = 'tenant:user:warehouse:document:line') => ({ scope, version: 'AQ==', pending: false, values: { quantity: '1,5', reason: 'Hàng thử nghiệm '.repeat(80) } });
test('private draft round trip, scope separation and bounded SecureStore chunks', async () => {
  const f = fixture(); const storage = f.load('src/lib/form-draft-storage.ts').formDraftStorage;
  await storage.write(draft(), () => {});
  assert.equal((await storage.read(draft().scope)).values.reason, draft().values.reason);
  assert.equal(await storage.read('another-tenant:user:warehouse:document:line'), null);
  for (const value of f.values.values()) assert.ok(Buffer.byteLength(value, 'utf8') <= 2048);
});
test('interrupted write preserves previous committed bank', async () => {
  const f = fixture(); const storage = f.load('src/lib/form-draft-storage.ts').formDraftStorage;
  await storage.write(draft(), () => {});
  f.reject(key => key.endsWith('.b.1'));
  await assert.rejects(storage.write({ ...draft(), values: { reason: 'New '.repeat(200) } }, () => {}));
  assert.equal((await storage.read(draft().scope)).values.reason, draft().values.reason);
});
test('oversized draft rejects rather than truncating and losing data', async () => {
  const f = fixture(); const storage = f.load('src/lib/form-draft-storage.ts').formDraftStorage;
  await assert.rejects(storage.write({ ...draft(), values: { reason: 'x'.repeat(22000) } }, () => {}));
  assert.equal(await storage.read(draft().scope), null);
});
test('pending marker survives restart read and expiry rejects stale draft', async () => {
  const f = fixture(); const storage = f.load('src/lib/form-draft-storage.ts').formDraftStorage;
  await storage.write({ ...draft(), pending: true }, () => {});
  assert.equal((await storage.read(draft().scope)).pending, true);
  for (const [key, value] of f.values) if (/\.[ab]\.0$/.test(key)) f.values.set(key, value.replace(/"savedAt":\d+/, '"savedAt":1'));
  // savedAt is stored at the end, so use a small complete payload for the expiry check.
  await storage.write({ ...draft('small'), values: {} }, () => {});
  for (const [key, value] of f.values) if (/\.[ab]\.0$/.test(key) && value.includes('"scope":"small"')) f.values.set(key, value.replace(/"savedAt":\d+/, '"savedAt":1'));
  assert.equal(await storage.read('small'), null);
});
test('logout invalidates queued writes and removes all indexed chunks', async () => {
  const f = fixture(); const storage = f.load('src/lib/form-draft-storage.ts').formDraftStorage;
  await storage.write(draft(), () => {});
  const write = storage.write(draft('other'), () => {}); const cleared = storage.clear();
  await assert.rejects(write); await cleared; assert.equal(f.values.size, 0);
});
test('scope guard checked during writes, no committed partial result', async () => {
  const f = fixture(); const storage = f.load('src/lib/form-draft-storage.ts').formDraftStorage;
  let checks = 0;
  await assert.rejects(storage.write(draft(), () => { if (++checks > 3) throw Error('Scope revoked'); }));
  assert.equal(await storage.read(draft().scope), null);
});
test('old document search continues beyond the first 20 pages', async () => {
  const f = fixture(); const { findPagedRecord } = f.load('src/lib/paged-record-search.ts');
  const cursor = { page: 1 }; const requested = [];
  const load = async page => { requested.push(page); return { items: [{ id: page }], pageNumber: page, pageSize: 1, totalCount: 24 }; };
  await assert.rejects(findPagedRecord(load, item => item.id === 23, cursor), error => error.statusCode === 422);
  assert.equal(cursor.page, 21);
  assert.equal((await findPagedRecord(load, item => item.id === 23, cursor)).id, 23);
  assert.deepEqual(requested.slice(20), [21, 22, 23]); assert.equal(cursor.page, 1);
});
test('old document lookup distinguishes complete absence, malformed feed and cancellation', async () => {
  const { load } = fixture(); const { findPagedRecord } = load('src/lib/paged-record-search.ts');
  assert.equal(await findPagedRecord(async () => ({ items: [], pageNumber: 1, pageSize: 20, totalCount: 0 }), () => false), null);
  await assert.rejects(findPagedRecord(async () => ({ items: [], pageNumber: 2, pageSize: 20, totalCount: 2 }), () => false));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(findPagedRecord(async () => { throw Error('must not fetch'); }, () => false, undefined, controller.signal), /Đã dừng/);
});
test('return schema matches current DTO and rejects missing approved placement fields', () => {
  const { load } = fixture(); const { goodsReturnSchema } = load('src/features/goods-returns/goods-returns.schema.ts');
  const item = { id: randomUUID(), productId: randomUUID(), stockIssuePickDetailId: randomUUID(), productName: 'QA', sku: 'QA', quantity: 1, condition: 'Good', restockSlotId: randomUUID(), lotId: null, lotNumber: null };
  const value = { id: randomUUID(), goodsReturnRequestCode: 'QA', stockIssueRequestId: randomUUID(), stockIssueRequestCode: 'ISSUE-QA', reason: 'Test', status: 'Approved', createdAt: new Date().toISOString(), createdBy: randomUUID(), approvedBy: randomUUID(), approvedAt: null, rejectionReason: null, items: [item] };
  assert.ok(goodsReturnSchema.safeParse(value).success);
  assert.equal(goodsReturnSchema.safeParse({ ...value, items: [{ ...item, quantity: -1 }] }).success, false);
  assert.equal(goodsReturnSchema.safeParse({ ...value, stockIssueRequestId: '' }).success, false);
});

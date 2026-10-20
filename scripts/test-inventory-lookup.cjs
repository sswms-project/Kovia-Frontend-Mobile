const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.dirname(require.resolve('../package.json'));
function sourceLoader(overrides = {}) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const module = { exports: {} };
    cache.set(filename, module.exports);
    const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
      if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), `${name}.ts`)));
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}
const load = sourceLoader();
const schema = load('src/features/inventory-lookup/inventory-lookup.schema.ts');
const logic = load('src/features/inventory-lookup/inventory-lookup.ts');
const warehouseId = '22222222-2222-2222-2222-222222222222';
const otherId = '44444444-4444-4444-4444-444444444444';
const productId = '33333333-3333-3333-3333-333333333333';
const match = (changes = {}) => ({ id: productId, warehouseId, type: 'Product', code: 'SKU-1', name: 'Búa', displayPath: 'SKU-1', ...changes });
const stock = (changes = {}) => ({ id: productId, productId, sku: 'SKU-1', productName: 'Búa', warehouseId, warehouseName: 'Kho A',
  slotId: otherId, slotCode: 'S', lotId: null, qualityStatus: 'Good', eligibilityStatus: 'InspectionHold',
  quantityOnHand: 10, reservedQuantity: 2, holdQuantity: 6, availableQuantity: 1,
  version: null, updatedAt: null, lotNumber: null, manufacturedDate: null, expiryDate: null, lotStatus: null,
  unitName: 'cái', canManageWarehouse: false, rackId: null, rackCode: null, zoneCode: null, isSystemDefaultSlot: false, lastCount: null, ...changes });
const list = (items = [stock()]) => ({ items, totalCount: items.length, pageNumber: 1, pageSize: 20, snapshotAt: '2026-10-19T08:00:00Z' });
function fixture(response) {
  const calls = [];
  const api = sourceLoader({ '@/lib/api': { api: { get: async (...args) => { calls.push(args); return { data: { data: response } }; } },
    unwrap: (value) => value.data.data } })('src/features/inventory-lookup/inventory-lookup.api.ts').inventoryLookupApi;
  return { api, calls };
}
test('input trims printable codes but rejects blank, oversized, control characters and unknown kind', () => {
  assert.equal(schema.lookupInputSchema.parse({ kind: 'Product', code: ' SKU ' }).code, 'SKU');
  for (const code of ['', '   ', 'SKU\n', '\tSKU', 'SKU\u0085', 'x'.repeat(513)])
    assert.equal(schema.lookupInputSchema.safeParse({ kind: 'Product', code }).success, false);
  assert.equal(schema.lookupInputSchema.safeParse({ kind: 'Unknown', code: 'SKU' }).success, false);
});
test('scan gate consumes only one event until explicitly armed again', () => {
  const gate = logic.createScanGate();
  assert.equal(gate.take(), false);
  gate.arm(); assert.equal(gate.take(), true); assert.equal(gate.take(), false);
  gate.arm(); gate.close(); assert.equal(gate.take(), false);
  gate.arm(); assert.equal(gate.take(), true);
});
test('exact lookup uses dedicated scoped endpoint with abort signal and no fuzzy inventory guess', async () => {
  const target = fixture({ matches: [match()], totalCount: 1 });
  const signal = new AbortController().signal;
  await target.api.resolve(warehouseId, { kind: 'Product', code: ' SKU-1 ' }, signal);
  assert.deepEqual(target.calls[0], ['/inventory/barcode-lookup', { params: { warehouseId, kind: 'Product', code: 'SKU-1' }, signal }]);
});
test('lookup fails closed on foreign warehouse or wrong candidate kind', async () => {
  await assert.rejects(fixture({ matches: [match({ warehouseId: otherId })], totalCount: 1 }).api.resolve(warehouseId, { kind: 'Product', code: 'SKU' }));
  await assert.rejects(fixture({ matches: [match({ type: 'Slot' })], totalCount: 1 }).api.resolve(warehouseId, { kind: 'Product', code: 'SKU' }));
});
test('ambiguous and truncated counts remain explicit; invalid total is rejected', () => {
  assert.equal(schema.barcodeResultSchema.parse({ matches: [match(), match({ id: otherId })], totalCount: 55 }).totalCount, 55);
  assert.equal(schema.barcodeResultSchema.safeParse({ matches: [match()], totalCount: 0 }).success, false);
});
test('all exact candidate kinds map to server ID filters and keep pagination scope', async () => {
  for (const [type, field] of [['Product', 'productId'], ['Zone', 'zoneId'], ['Rack', 'rackId'], ['Slot', 'slotId']]) {
    const target = fixture(list([]));
    await target.api.list(warehouseId, match({ type }), 2);
    assert.deepEqual(target.calls[0][1].params, { warehouseId, pageNumber: 2, pageSize: 20, [field]: productId });
  }
});
test('inventory trusts server Available even when it differs from on-hand minus reserved', async () => {
  const result = await fixture(list()).api.list(warehouseId, null, 1);
  assert.equal(result.items[0].availableQuantity, 1);
  assert.equal(result.items[0].quantityOnHand - result.items[0].reservedQuantity, 8);
  assert.equal(result.items[0].lotId, null);
});
test('inventory rejects foreign scope, wrong exact IDs and malformed quantities', async () => {
  for (const changes of [{ warehouseId: otherId }, { productId: otherId }, { availableQuantity: null }])
    await assert.rejects(fixture(list([stock(changes)])).api.list(warehouseId, match(), 1));
  await assert.rejects(fixture(list([])).api.list(warehouseId, match({ warehouseId: otherId }), 1));
  await assert.rejects(fixture(list([])).api.list(warehouseId, null, 0));
});
test('lookup validates warehouse before sending any request', async () => {
  const target = fixture({ matches: [], totalCount: 0 });
  await assert.rejects(target.api.resolve('', { kind: 'Location', code: 'S' }));
  assert.equal(target.calls.length, 0);
});

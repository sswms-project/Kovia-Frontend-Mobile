const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { randomUUID, createHash } = require('node:crypto');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function loader(overrides = {}) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const output = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    const localRequire = name => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name.startsWith('@/') || name.startsWith('.')) return load(name.startsWith('@/') ? `src/${name.slice(2)}.ts` : path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.ts')));
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(localRequire, module, module.exports);
    return module.exports;
  }
  return load;
}
const load = loader(), rules = load('src/features/return-work/return-work.ts'), schema = load('src/features/return-work/return-work.schema.ts');
const { P } = load('src/config/permission-codes.ts');
const itemId = randomUUID(), slotId = randomUUID(), documentId = randomUUID(), taskId = randomUUID(), warehouseId = randomUUID(), userId = randomUUID();
const proof = () => ({ expectedVersion: 'doc-v1', taskId, taskVersion: 'task-v1', commandId: randomUUID() });
const slot = { slotId, slotCode: '__SYSTEM_DEFAULT__', path: 'Khu vực 1 / Kệ A07', availableQuantity: null, warnings: [], scanCodes: ['A07', 'K01-A07', `KOVIA:LOC:RACK:${randomUUID()}`] };
const customer = { version: 'doc-v1', items: [{ id: itemId, productName: 'Bia Tiger', quantity: 2 }] };
const options = { version: 'doc-v1', items: [{ returnItemId: itemId, conditionOptions: [{ condition: 'Good', options: [slot] }, { condition: 'Damaged', options: [] }] }] };
const received = () => ({ items: [{ returnItemId: itemId, condition: 'Good', restockSlotId: slotId, scannedSlotCode: 'K01-A07' }], lines: [] });
const supplierLine = { id: itemId, productName: 'Bia Tiger', quantity: 2, quantityPrecision: 0, sourceScanCodes: ['A07'], productScanCodes: ['SKU000005', 'BAR'] };
const supplier = { items: [supplierLine] };
const delivered = () => ({ items: [], lines: [{ itemId, deliveredQuantity: 2, scannedSlotCode: 'A07', scannedProductCode: 'BAR' }] });
test('return tasks require all four permissions, exact task, warehouse and assignee', () => {
  const permissions = [P.WAREHOUSE_TASKS_VIEW_OWN, P.WAREHOUSE_TASKS_MANAGE_OWN, P.GOODS_RETURN_REQUESTS_VIEW, P.GOODS_RETURN_REQUESTS_RESTOCK];
  assert.equal(rules.hasReturnPermissions(false, { permissions }), true);
  for (const permission of permissions) assert.equal(rules.hasReturnPermissions(false, { permissions: permissions.filter(value => value !== permission) }), false);
  assert.equal(rules.hasReturnPermissions(true, { permissions }), false);
  const work = { taskId, warehouseId, assignedTo: userId, assignmentRequired: true };
  rules.assertReturnWork(work, taskId, warehouseId, userId);
  for (const change of [{ taskId: randomUUID() }, { warehouseId: randomUUID() }, { assignedTo: randomUUID() }, { assignmentRequired: false }])
    assert.throws(() => rules.assertReturnWork({ ...work, ...change }, taskId, warehouseId, userId));
});
test('return scan honors BE label lists, rejects internal default, wrong labels, overlong and control characters', () => {
  for (const code of slot.scanCodes) assert.equal(rules.matchesReturnSlot(` ${code.toLowerCase()} `, slot), true);
  for (const code of ['__SYSTEM_DEFAULT__', 'A08', 'x'.repeat(101), 'A07\n']) assert.equal(rules.matchesReturnSlot(code, slot), false);
  assert.equal(rules.matchesReturnSlot('A07', { ...slot, scanCodes: [] }), false);
  assert.equal(rules.matchesReturnSlot(`KOVIA:LOC:SLOT:${slotId}`, { ...slot, scanCodes: null }), true);
});
test('customer restock validates complete unique lines, matching version and condition-specific placement', () => {
  rules.assertCustomerReturn(customer, options, received());
  for (const values of [ { items: [], lines: [] }, { items: [received().items[0], received().items[0]], lines: [] },
    { items: [{ ...received().items[0], returnItemId: randomUUID() }], lines: [] },
    { items: [{ ...received().items[0], condition: 'Damaged' }], lines: [] },
    { items: [{ ...received().items[0], scannedSlotCode: 'A08' }], lines: [] } ]) assert.throws(() => rules.assertCustomerReturn(customer, options, values));
  assert.throws(() => rules.assertCustomerReturn(customer, { ...options, version: 'doc-v2' }, received()));
  const scrap = { items: [{ ...received().items[0], condition: 'Scrap', restockSlotId: null, scannedSlotCode: null }], lines: [] };
  rules.assertCustomerReturn(customer, options, scrap);
  assert.equal(schema.returnFormSchema.safeParse(scrap).success, true);
  assert.equal(schema.returnFormSchema.safeParse({ ...scrap, items: [{ ...scrap.items[0], restockSlotId: slotId }] }).success, false);
});
test('supplier delivery requires all lines, positive total, exact source/product and unit precision without rounding', () => {
  rules.assertSupplierReturn(supplier, delivered());
  for (const change of [{ deliveredQuantity: 0 }, { deliveredQuantity: -1 }, { deliveredQuantity: 3 }, { deliveredQuantity: 0.5 },
    { deliveredQuantity: NaN }, { scannedSlotCode: 'A08' }, { scannedProductCode: 'other' }, { itemId: randomUUID() }])
    assert.throws(() => rules.assertSupplierReturn(supplier, { items: [], lines: [{ ...delivered().lines[0], ...change }] }));
  const second = { ...supplierLine, id: randomUUID() };
  rules.assertSupplierReturn({ items: [supplierLine, second] }, { items: [], lines: [...delivered().lines, { itemId: second.id, deliveredQuantity: 0, scannedSlotCode: null, scannedProductCode: null }] });
  const fractional = { items: [{ ...supplierLine, quantityPrecision: 6 }] };
  rules.assertSupplierReturn(fractional, { items: [], lines: [{ ...delivered().lines[0], deliveredQuantity: 1.25 }] });
  assert.throws(() => rules.assertSupplierReturn(fractional, { items: [], lines: [{ ...delivered().lines[0], deliveredQuantity: 1.251 }] }));
});
test('return API uses separate task IDs and document IDs, exact body and versioned commands', async () => {
  const calls = [], api = { post: async (...args) => { calls.push(args); return {}; } };
  const local = loader({ '@/lib/api': { api, unwrap: value => value } });
  const { returnWorkApi } = local('src/features/return-work/return-work.api.ts');
  const command = { kind: 'Supplier', body: { ...proof(), lines: delivered().lines } };
  await returnWorkApi.send(true, documentId, command, () => {});
  assert.equal(calls[0][0], `/supplier-returns/${documentId}/deliver`);
  assert.deepEqual(calls[0][1], command.body);
  const management = { kind: 'Manage', body: { taskId, documentVersion: 'v1', taskVersion: 't1', commandId: randomUUID(), action: 'Pause', reason: 'Kiểm tra hàng' } };
  await returnWorkApi.send(false, documentId, management, () => {});
  assert.equal(calls[1][0], `/return-work/false/documents/${documentId}/actions`);
  await assert.rejects(returnWorkApi.send(false, documentId, command, () => {}));
  assert.equal(schema.returnCommandSchema.safeParse({ ...command, body: { lines: delivered().lines } }).success, false);
});
function hooks() {
  const states = [], effects = [], layout = []; let cursor = 0;
  return { react: { useRef: value => { const index = cursor++; return states[index] ??= { current: value }; },
    useState: value => { const index = cursor++; if (!(index in states)) states[index] = value; return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
    useEffect: callback => { const index = cursor++; if (!(index in states)) { states[index] = true; effects.push(callback); } },
    useLayoutEffect: callback => layout.push(callback) },
    render: callback => { cursor = 0; const value = callback(); layout.splice(0).forEach(effect => effect()); effects.splice(0).forEach(effect => effect()); return value; } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('acknowledged results replace stale delivery quantities and customer locations without a new read', () => {
  const work = { executionStatus: 'InProgress', canComplete: true, canManage: true };
  const result = rules.confirmedReturnData({ work, document: { ...supplier, code: 'NCC', items: [{ ...supplierLine, deliveredQuantity: null }] }, options: null },
    { kind: 'Supplier', body: { ...proof(), lines: [{ ...delivered().lines[0], deliveredQuantity: 1 }] } });
  assert.equal(result.document.items[0].deliveredQuantity, 1); assert.equal(result.work.executionStatus, 'Completed'); assert.equal(result.work.canComplete, false);
  const receivedResult = rules.confirmedReturnData({ work, document: { ...customer, goodsReturnRequestCode: 'KTH' }, options }, { kind: 'Customer', body: { ...proof(), items: received().items } });
  assert.equal(receivedResult.document.items[0].restockLocation, slot.path);
  assert.equal(receivedResult.document.items[0].actualCondition, 'Good'); assert.equal(receivedResult.document.status, 'Restocked');
  assert.equal(work.executionStatus, 'InProgress');
});
test('pending return task lookup recovers its document without current assignment and stays account/warehouse/type scoped', async () => {
  const entries = new Map();
  const SecureStore = { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1, isAvailableAsync: async () => true,
    getItemAsync: async key => entries.get(key) ?? null, setItemAsync: async (key, value) => { entries.set(key, value); }, deleteItemAsync: async key => { entries.delete(key); } };
  const { formDraftStorage: storage } = loader({ './secure-store': { SecureStore }, 'expo-crypto': {
    CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_, value) => createHash('sha256').update(value).digest('hex') } })('src/lib/form-draft-storage.ts');
  const context = ['api', userId, warehouseId];
  await storage.write({ scope: JSON.stringify([...context, 'return-work', documentId]), version: 'v1', pending: true,
    operation: { operation: 'Return', commandId: randomUUID(), fingerprint: 'hash', expectedVersion: 'v1', documentId },
    values: { supplier: true, documentId, command: { kind: 'Manage', body: { taskId } } } }, () => {});
  assert.deepEqual(await storage.pendingReturnTask(context, taskId, true), { documentId });
  assert.equal(await storage.pendingReturnTask(context, taskId, false), null);
  assert.equal(await storage.pendingReturnTask(['api', randomUUID(), warehouseId], taskId, true), null);
  assert.equal(await storage.pendingReturnTask(['api', userId, randomUUID()], taskId, true), null);
  assert.equal(await storage.pendingReturnTask(context, randomUUID(), true), null);
});
function commandFixture(storage, send, assertCurrent = () => {}) {
  const run = hooks();
  const overrides = { react: run.react, 'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_, text) => createHash('sha256').update(text).digest('hex') },
    '@/hooks/use-screen-exit': { useExitProtection() {} }, '@/lib/api-error': { getApiErrorMessage: error => error.message, isApiErrorResponse: error => typeof error.statusCode === 'number', logApiError() {} },
    '@/lib/form-draft-storage': { formDraftStorage: storage } };
  const { useReturnCommand } = loader(overrides)('src/features/return-work/hooks/use-return-command.ts');
  const props = { scope: JSON.stringify(['api', userId, warehouseId, 'return-work', documentId]), supplier: true, documentId, assertCurrent, send };
  return { render: () => run.render(() => useReturnCommand(props)), props };
}
test('unknown return command survives reopen and retries immutable body; replay rejection never unlocks a replacement', async () => {
  let records = [], calls = [];
  const storage = { pending: async () => records, write: async record => { records = [structuredClone(record)]; }, remove: async () => { records = []; } };
  const original = { kind: 'Supplier', body: { ...proof(), lines: delivered().lines } };
  const first = commandFixture(storage, async command => { calls.push(structuredClone(command)); throw new Error('timeout'); });
  first.render(); await tick();
  assert.equal(await first.render().run(original), false);
  assert.equal(first.render().pending, true); assert.equal(records.length, 1);
  const reopened = commandFixture(storage, async command => { calls.push(structuredClone(command)); throw Object.assign(new Error('Conflict'), { statusCode: 409 }); });
  reopened.render(); await tick(); await tick();
  assert.equal(reopened.render().ready, true);
  assert.equal(await reopened.render().run({ ...original, body: { ...original.body, commandId: randomUUID() } }), false);
  assert.deepEqual(calls[1], original); assert.equal(records.length, 1);
  const recovered = commandFixture(storage, async command => { calls.push(structuredClone(command)); });
  recovered.render(); await tick(); await tick();
  assert.equal(await recovered.render().run(), true);
  assert.deepEqual(calls[2], original); assert.equal(records.length, 0); assert.equal(recovered.render().pending, false);
});
test('fresh authoritative rejection unlocks editing, storage failure prevents sending, and legacy pending blocks new commands', async () => {
  let records = [], calls = 0;
  const storage = { pending: async () => records, write: async record => { records = [record]; }, remove: async () => { records = []; } };
  const original = { kind: 'Supplier', body: { ...proof(), lines: delivered().lines } };
  const rejected = commandFixture(storage, async () => { calls++; throw Object.assign(new Error('Invalid'), { statusCode: 422 }); });
  rejected.render(); await tick(); await rejected.render().run(original);
  assert.equal(rejected.render().pending, false); assert.equal(records.length, 0);
  const failed = commandFixture({ ...storage, write: async () => { throw new Error('Storage unavailable'); } }, async () => { calls++; });
  failed.render(); await tick(); await failed.render().run(original); assert.equal(calls, 1);
  records = [{ scope: 'legacy', values: {}, operation: null }];
  const legacy = commandFixture(storage, async () => { calls++; }); legacy.render(); await tick();
  assert.equal(legacy.render().ready, false); assert.match(legacy.render().error, /đối soát/);
  assert.equal(await legacy.render().run(original), false); assert.equal(calls, 1);
});
test('return navigation opens task IDs and generic unversioned actions are blocked', async () => {
  const profile = { id: userId, permissions: [P.WAREHOUSE_TASKS_VIEW_OWN, P.WAREHOUSE_TASKS_MANAGE_OWN, P.SUPPLIER_RETURNS_VIEW, P.SUPPLIER_RETURNS_DISPATCH] };
  const task = { id: taskId, sourceDocumentId: documentId, taskType: 'SupplierReturnDispatch', warehouseId, assignedTo: userId, executionStatus: 'Queued' };
  const navigation = load('src/features/my-tasks/my-tasks.navigation.ts');
  assert.deepEqual(navigation.getTaskDestination(task, profile, warehouseId), { pathname: '/(account)/supplier-return/[id]', params: { id: taskId } });
  assert.equal(navigation.getTaskDestination(task, profile, randomUUID()), null);
  assert.equal(navigation.getTaskDestination(task, { ...profile, permissions: [] }, warehouseId), null);
  const taskRules = load('src/features/my-tasks/my-tasks.ts');
  assert.deepEqual(taskRules.availableTaskActions(task, true), []);
  let calls = 0;
  const api = loader({ '@/lib/api': { api: { post: async () => { calls++; } } } })('src/features/my-tasks/my-tasks.api.ts');
  assert.throws(() => api.myTasksApi.action(task.taskType, taskId, { action: 'Start' })); assert.equal(calls, 0);
});
const nodes = value => Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === 'object' ? [value, ...nodes(value.props?.children)] : [];
function lineFixture() {
  const run = hooks();
  const values = { items: [{ ...received().items[0] }], lines: [{ ...delivered().lines[0], scannedSlotCode: null, scannedProductCode: null }] };
  const read = name => name.split('.').reduce((value, part) => value?.[part], values);
  const form = { control: { values }, formState: { errors: {} }, getValues: read,
    setValue(name, value) { const parts = name.split('.'), last = parts.pop(); const target = parts.reduce((value, part) => value[part], values); target[last] = value; } };
  const jsx = (type, props) => ({ type, props });
  const overrides = { react: run.react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-hook-form': { Controller: 'Controller', useWatch: ({ name }) => read(name) },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', TextInput: 'TextInput', StyleSheet: { create: value => value } },
    'lucide-react-native': {}, '@/constants/theme': { FontFamily: {}, Radius: {} }, '@/hooks/use-theme': { useTheme: () => ({}) },
    '@/features/inventory/inventory.labels': { formatInventoryLocation: () => 'Khu 1 / Kệ A07' } };
  for (const [name, symbol] of [['@/components/ui/button','Button'], ['@/components/ui/alert-banner','AlertBanner'], ['@/components/ui/selection-field','SelectionField'], ['@/components/ui/text-field','TextField'], ['@/components/ui/work-details','WorkDetails'], ['@/features/scanner/components/scan-code-button','ScanCodeButton']]) overrides[name] = { [symbol]: symbol };
  return { form, values, load: loader(overrides), render: callback => nodes(run.render(callback)) };
}
test('supplier camera advances source to product in one session and never changes quantity or submits on scan', () => {
  const fixture = lineFixture();
  const { SupplierReturnLine } = fixture.load('src/features/return-work/components/supplier-return-line.tsx');
  const render = () => fixture.render(() => SupplierReturnLine({ line: supplierLine, index: 0, form: fixture.form, editable: true, disabled: false }));
  const camera = render().find(node => node.type === 'ScanCodeButton').props;
  assert.equal(camera.continuous, true); assert.equal(camera.onScan('BAR'), false);
  assert.equal(camera.onScan('A07'), true); assert.equal(camera.closeAfterScan(), false);
  assert.equal(camera.onScan('BAR'), true); assert.equal(camera.closeAfterScan(), true);
  assert.equal(fixture.values.lines[0].deliveredQuantity, 2);
  render().find(node => node.type === 'ScanCodeButton').props.onOpen();
  assert.equal(fixture.values.lines[0].scannedSlotCode, null); assert.equal(fixture.values.lines[0].scannedProductCode, null);
  assert.equal(render().find(node => node.type === 'ScanCodeButton').props.onScan('A08'), false);
});
test('customer changing condition clears location proof and selects only that condition options', () => {
  const fixture = lineFixture();
  const { CustomerReturnLine } = fixture.load('src/features/return-work/components/customer-return-line.tsx');
  const render = () => fixture.render(() => CustomerReturnLine({ line: { ...customer.items[0], sku:'SKU', condition:'Good', lotNumber:null }, index:0, form:fixture.form, options, editable:true, disabled:false }));
  assert.equal(render().find(node => node.type === 'ScanCodeButton').props.onScan('A07'), true);
  render().find(node => node.type === 'SelectionField' && node.props.label === 'Tình trạng thực nhận').props.onChange('Damaged');
  assert.equal(fixture.values.items[0].scannedSlotCode, null); assert.equal(fixture.values.items[0].restockSlotId, null);
  assert.equal(render().find(node => node.type === 'ScanCodeButton').props.disabled, true);
  render().find(node => node.type === 'SelectionField' && node.props.label === 'Tình trạng thực nhận').props.onChange('Scrap');
  assert.equal(render().some(node => node.type === 'ScanCodeButton'), false);
});

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
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
    const module = { exports: {} }; cache.set(filename, module.exports);
    const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = name => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name === 'expo-crypto') return { randomUUID };
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
const schema = load('src/features/receiving/receiving.schema.ts');
const logic = load('src/features/receiving/receiving.ts');
const { P } = load('src/config/permission-codes.ts');
const { warehouseSnapshot } = load('src/features/warehouse-access/warehouse-access.ts');
const warehouseId = '11111111-1111-1111-1111-111111111111';
const inboundId = '22222222-2222-2222-2222-222222222222';
const userId = '33333333-3333-3333-3333-333333333333';
const lineId = '44444444-4444-4444-4444-444444444444';
const unitId = '55555555-5555-5555-5555-555555555555';
const sourceId = '66666666-6666-6666-6666-666666666666';
const slotId = '77777777-7777-7777-7777-777777777777';
const receiptId = '88888888-8888-8888-8888-888888888888';
const line = () => ({ inboundRequestItemId: lineId, enteredUnitId: unitId, receivedQty: 4, damagedQty: 0, rejectedQty: 0,
  exceptionReason: '', lotNumber: '', manufacturedDate: '', expiryDate: '' });
const form = () => ({ receiptCode: 'GR-QA', lines: [line()] });
const task = changes => ({ version: 'AQ==', warehouseCode: 'WH', supplierCode: null, inboundRequestId: inboundId,
  inboundRequestCode: 'IR-QA', warehouseId, warehouseName: 'Kho QA', supplierId: null, supplierName: null,
  sourceType: 'Supplier', sourceName: 'Nguồn QA', expectedDate: null, createdAt: '2026-10-19T10:00:00Z',
  orderedQuantity: 10, receivedQuantity: 0, remainingQuantity: 10, activeDocumentImportId: null, activeGoodsReceiptId: null,
  activeGoodsReceiptStatus: null, assignedTo: userId, assignedToName: 'QA', assignedAt: null, executionStatus: 'InProgress', priority: 'Normal', dueAt: null,
  lines: [{ inboundRequestItemId: lineId, productId: lineId, productSKU: 'SKU', productName: 'Sản phẩm QA', barcodeValue: null,
    isLotTracked: false, orderedQuantity: 10, receivedQuantity: 0, remainingQuantity: 10, baseUnitId: unitId,
    baseUnitName: 'Cái', enteredUnitId: unitId, enteredUnitName: 'Cái', conversionFactorSnapshot: 1, baseUnitQuantityPrecision: 0, enteredUnitQuantityPrecision: 0 }], ...changes });
const receipt = () => ({ id: receiptId, receiptCode: 'GR-QA', warehouseId, inboundRequestId: inboundId,
  receivingAssignedTo: userId, putAwayAssignedTo: userId, receivingSlotId: sourceId, arrivalStockPostedAt: '2026-10-19T10:00:00Z',
  status: 'Approved', putAwayTaskExecutionStatus: 'InProgress', putAwayTaskRequiresReconciliation: false,
  items: [{ id: lineId, inboundRequestItemId: lineId, productId: lineId, receivedQuantity: 4, damagedQuantity: 0, rejectedQuantity: 0,
    remainingPutAwayQuantity: 4, baseUnitId: unitId, lotNumber: null, manufacturedDate: null, expiryDate: null,
    allowedUnits: [{ unitId, quantityPrecision: 0 }] }] });
const placement = () => ({ goodsReceiptItemId: lineId, slotId, quantity: 2, confirmedSlotCode: 'S01', overrideReason: '' });

test('acceptance-first records full refusal without accepting stock and requires its reason', () => {
  assert.equal(schema.createReceiptFormSchema.safeParse({ ...form(), lines: [{ ...line(), receivedQty: 0, rejectedQty: 10, exceptionReason: 'Bên giao giữ hàng lỗi.' }] }).success, true);
  assert.equal(schema.createReceiptFormSchema.safeParse({ ...form(), lines: [{ ...line(), receivedQty: 0, rejectedQty: 10 }] }).success, false);
  assert.equal(schema.createReceiptFormSchema.safeParse({ ...form(), lines: [{ ...line(), receivedQty: 0, rejectedQty: 0 }] }).success, false);
});
test('refused packaging obeys base precision and does not reduce accepted remaining twice', () => {
  logic.assertReceiptQuantities({ ...form(), lines: [{ ...line(), receivedQty: 8, rejectedQty: 2, exceptionReason: 'Từ chối.' }] }, task());
  assert.throws(() => logic.assertReceiptQuantities({ ...form(), lines: [{ ...line(), rejectedQty: 0.5 }] }, task()), /đơn vị/);
});
test('damage separation requires explicit physical confirmation and a location code', () => {
  const body = { goodsReceiptItemId: lineId, destinationSlotId: slotId, quantity: 2, confirmedSlotCode: 'Q01', physicallySeparated: true, expectedVersion: 'AQ==', commandId: randomUUID() };
  assert.equal(schema.isolateDamageCommandSchema.safeParse(body).success, true);
  assert.equal(schema.isolateDamageCommandSchema.safeParse({ ...body, physicallySeparated: false }).success, false);
  assert.equal(schema.isolateDamageCommandSchema.safeParse({ ...body, confirmedSlotCode: '' }).success, false);
});

test('command memory reuses UUID for exact retry and replaces it for changed version or content', () => {
  const first = logic.receiptCommand(null, { expectedVersion: 'AQ==', quantity: 2 });
  assert.equal(logic.receiptCommand(first, { expectedVersion: 'AQ==', quantity: 2 }), first);
  assert.notEqual(logic.receiptCommand(first, { expectedVersion: 'Ag==', quantity: 2 }).commandId, first.commandId);
  assert.notEqual(logic.receiptCommand(first, { expectedVersion: 'AQ==', quantity: 3 }).commandId, first.commandId);
});
test('history localizes lifecycle states and does not show internal assignee identifiers as status', () => {
  assert.equal(logic.receiptHistoryTransition('Draft', 'PendingApproval'), 'Nháp → Chờ duyệt');
  assert.equal(logic.receiptHistoryTransition(null, userId), '');
});
test('actual receipt requires explicit positive quantity and unique lines', () => {
  assert.ok(schema.createReceiptFormSchema.safeParse(form()).success);
  for (const receivedQty of [0, -1, NaN, Infinity]) assert.equal(schema.createReceiptFormSchema.safeParse({ ...form(), lines: [{ ...line(), receivedQty }] }).success, false);
  assert.equal(schema.createReceiptFormSchema.safeParse({ ...form(), lines: [line(), line()] }).success, false);
  assert.equal(schema.createReceiptFormSchema.safeParse({ ...form(), lines: [] }).success, false);
});
test('damage must partition actual receipt and have an evidenced description; lot dates are real calendar dates', () => {
  for (const change of [{ damagedQty: 5, exceptionReason: 'hỏng' }, { damagedQty: 1 }, { lotNumber: 'x'.repeat(101) },
    { manufacturedDate: '2026-02-31' }, { manufacturedDate: '2026-10-19', expiryDate: '2026-10-18' }, { exceptionReason: 'x'.repeat(501) }])
    assert.equal(schema.createReceiptFormSchema.safeParse({ ...form(), lines: [{ ...line(), ...change }] }).success, false);
});
test('version, nonempty command and explicit source are required by write contracts', () => {
  assert.equal(schema.createReceiptCommandSchema.safeParse({ ...form(), inboundRequestId: inboundId }).success, false);
  assert.equal(schema.updateReceiptCommandSchema.safeParse({ ...form(), expectedVersion: '' }).success, false);
  assert.equal(schema.submitReceiptCommandSchema.safeParse({ expectedVersion: 'AQ==', commandId: receiptId }).success, false);
});
test('physical source and current assignee must match exact task and receipt identity', () => {
  assert.equal(logic.assertReceivingTask(task(), warehouseId, userId, inboundId).inboundRequestId, inboundId);
  for (const change of [{ warehouseId: sourceId }, { assignedTo: sourceId }, { inboundRequestId: sourceId }])
    assert.throws(() => logic.assertReceivingTask(task(change), warehouseId, userId, inboundId));
  assert.throws(() => logic.assertReceiptScope({ ...receipt(), receivingAssignedTo: sourceId }, warehouseId, userId, 'receiving', inboundId));
  assert.throws(() => logic.assertReceiptScope({ ...receipt(), putAwayAssignedTo: sourceId }, warehouseId, userId, 'putaway'));
});
test('inactive membership, removed permission or inactive warehouse blocks even a still-cached task', () => {
  const profile = { id: userId, tenantId: inboundId, status: 'Active', permissions: [P.GOODS_RECEIPTS_VIEW, P.GOODS_RECEIPTS_SUBMIT],
    assignedWarehouses: [{ id: warehouseId, warehouseCode: 'WH', warehouseName: 'QA', status: 'Active' }] };
  const snapshot = warehouseSnapshot(profile);
  const scope = { identity: snapshot.identity, warehouseId, signature: snapshot.signature, revision: 1 };
  logic.assertReceivingContext(scope, profile, true, P.GOODS_RECEIPTS_SUBMIT);
  assert.throws(() => logic.assertReceivingContext(scope, { ...profile, permissions: [P.GOODS_RECEIPTS_VIEW] }, true, P.GOODS_RECEIPTS_SUBMIT));
  assert.throws(() => logic.assertReceivingContext(scope, { ...profile, status: 'Inactive' }, true, P.GOODS_RECEIPTS_SUBMIT));
  assert.throws(() => logic.assertReceivingContext(scope, profile, false, P.GOODS_RECEIPTS_SUBMIT));
  assert.throws(() => logic.assertReceivingContext(scope, { ...profile, assignedWarehouses: [] }, true, P.GOODS_RECEIPTS_SUBMIT));
});
test('base and package precision, remaining entitlement and lot tracking are checked before write', () => {
  logic.assertReceiptQuantities(form(), task());
  for (const change of [{ receivedQty: 11 }, { receivedQty: 0.5 }, { damagedQty: 0.5 }, { enteredUnitId: slotId }, { receivedQty: Number.MAX_SAFE_INTEGER + 1 }])
    assert.throws(() => logic.assertReceiptQuantities({ ...form(), lines: [{ ...line(), ...change }] }, task()));
  const tracked = task(); tracked.lines[0].isLotTracked = true;
  assert.throws(() => logic.assertReceiptQuantities(form(), tracked));
  const packaged = task(); Object.assign(packaged.lines[0], { enteredUnitId: slotId, conversionFactorSnapshot: 3, enteredUnitQuantityPrecision: 2 });
  assert.throws(() => logic.assertReceiptQuantities({ ...form(), lines: [{ ...line(), enteredUnitId: slotId, receivedQty: 0.5 }] }, packaged));
});
test('inspection correction preserves physical quantity, unit, lot and source lines', () => {
  logic.assertReceiptCorrection(form(), receipt());
  for (const change of [{ receivedQty: 5 }, { enteredUnitId: slotId }, { lotNumber: 'NEW' }, { damagedQty: 0.5 }])
    assert.throws(() => logic.assertReceiptCorrection({ ...form(), lines: [{ ...line(), ...change }] }, receipt()));
  assert.throws(() => logic.assertReceiptCorrection({ ...form(), receiptCode: 'DIFFERENT' }, receipt()));
});
test('placement excludes held/legacy/cancelled receipt, identical source and invalid base quantity', () => {
  logic.assertPlacement(placement(), receipt());
  for (const change of [{ status: 'PendingApproval' }, { arrivalStockPostedAt: null }, { putAwayTaskExecutionStatus: 'Cancelled' }, { putAwayTaskRequiresReconciliation: true }])
    assert.throws(() => logic.assertPlacement(placement(), { ...receipt(), ...change }));
  for (const change of [{ slotId: sourceId }, { quantity: 5 }, { quantity: 0.5 }])
    assert.throws(() => logic.assertPlacement({ ...placement(), ...change }, receipt()));
});
test('task read sends exact source ID, active warehouse and assignee, rejecting mixed result scopes', async () => {
  const calls = [];
  const response = { items: [task()], totalCount: 1, pageNumber: 1, pageSize: 20, taskStats: { totalOpenCount: 1, unassignedCount: 0, inProgressCount: 1, pausedCount: 0 } };
  const api = sourceLoader({ '@/lib/api': { api: { get: async (...args) => { calls.push(args); return { data: { data: response } }; } }, unwrap: value => value.data.data } })('src/features/receiving/receiving.api.ts').receivingApi;
  assert.equal((await api.task(warehouseId, userId, inboundId)).inboundRequestId, inboundId);
  assert.deepEqual(calls[0][1].params, { warehouseId, assignedTo: userId, inboundRequestId: inboundId, pageSize: 20, pageNumber: 1 });
  response.items = [task({ warehouseId: slotId })]; await assert.rejects(api.task(warehouseId, userId, inboundId));
  response.items = [task(), task()]; await assert.rejects(api.task(warehouseId, userId, inboundId));
  response.items = []; assert.equal(await api.task(warehouseId, userId, inboundId), null);
});
test('create writes normalize empty optional dates and retain the context guard for the API interceptor', async () => {
  let sent;
  let verified = 0;
  const api = sourceLoader({ '@/lib/api': { api: { post: async (...args) => { sent = args; args[2].assertCurrentContext(); return { data: { data: receiptId } }; } }, unwrap: value => value.data.data } })('src/features/receiving/receiving.api.ts').receivingApi;
  await api.create({ ...form(), inboundRequestId: inboundId, expectedInboundVersion: 'AQ==', commandId: randomUUID() }, () => { verified += 1; });
  assert.equal(verified, 1); assert.equal(sent[0], '/goods-receipts');
  assert.equal(sent[1].lines[0].manufacturedDate, null); assert.equal(sent[1].lines[0].expiryDate, null);
  assert.equal(sent[1].lines[0].lotNumber, null); assert.equal(sent[1].expectedInboundVersion, 'AQ==');
});
test('recommendation selection checks scope/version/source and stores only a UI label with the exact slot ID', () => {
  let stored = null;
  const hook = sourceLoader({
    react: { useState: () => [null, value => { stored = value; }] },
    '@tanstack/react-query': { useQuery: () => ({}) },
    'react-hook-form': { useForm: () => ({}) },
    '@hookform/resolvers/zod': { zodResolver: () => undefined },
    '../receiving.api': { receivingApi: { locations: () => { throw new Error('Selection test must not issue HTTP'); } } },
  })('src/features/receiving/hooks/use-receiving-locations.ts').useReceivingLocations;
  const context = { contextKey: 'qa', receiptId, canView: true, prefix: ['qa'], receipt: { data: { version: 'AQ==', receivingSlotId: sourceId } }, allowed: () => true };
  const state = hook(context);
  const result = { key: 'qa', version: 'AQ==', data: { items: [{ suggestions: [{ slotId, slotCode: 'S01', rackCode: 'R', zoneName: 'Khu nhận' }, { slotId: sourceId }] }] } };
  state.chooseSuggested({ ...result, key: 'other-scope' }, slotId); assert.equal(stored, null);
  state.chooseSuggested({ ...result, version: 'Ag==' }, slotId); assert.equal(stored, null);
  state.chooseSuggested(result, sourceId); assert.equal(stored, null);
  state.chooseSuggested(result, slotId);
  assert.deepEqual(stored.selected, { id: slotId, slotCode: 'S01', displayPath: 'Khu nhận · R · S01' });
  assert.equal('zoneCode' in stored.selected, false);
});

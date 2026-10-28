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
test('receipt evidence lists enforce separate, unique and bounded IDs before submission', () => {
  const body = { expectedVersion: 'AQ==', commandId: randomUUID(), receivingSlotId: null };
  const photo = randomUUID();
  assert.equal(schema.submitReceiptCommandSchema.safeParse(body).success, true);
  for (const field of ['documentEvidenceIds', 'refusalEvidenceIds']) {
    assert.equal(schema.submitReceiptCommandSchema.safeParse({ ...body, [field]: [photo] }).success, true);
    assert.equal(schema.submitReceiptCommandSchema.safeParse({ ...body, [field]: [photo, photo] }).success, false);
    assert.equal(schema.submitReceiptCommandSchema.safeParse({ ...body, [field]: Array.from({ length: 6 }, randomUUID) }).success, false);
    assert.equal(schema.submitReceiptCommandSchema.safeParse({ ...body, [field]: ['00000000-0000-0000-0000-000000000000'] }).success, false);
  }
  assert.equal(schema.submitReceiptCommandSchema.safeParse({ ...body, documentEvidenceIds: [photo], refusalEvidenceIds: [photo] }).success, false);
});
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
test('receiving location contract preserves the backend suggestion and accepts older responses', () => {
  const location = { id: sourceId, zoneCode: 'Z', rackCode: 'R', slotCode: 'S', displayPath: 'Khu chờ cất' };
  assert.equal(schema.receivingLocationSchema.parse({ ...location, isSuggested: true }).isSuggested, true);
  assert.equal(schema.receivingLocationSchema.parse(location).isSuggested, undefined);
});
test('receipt code suggestion uses the existing GET endpoint, forwards cancellation and rejects invalid codes', async () => {
  const calls = [];
  let code = 'PN000010';
  const api = sourceLoader({ '@/lib/api': { api: {
    get: async (...args) => { calls.push(args); return { data: { data: code } }; },
  }, unwrap: value => value.data.data } })('src/features/receiving/receiving.api.ts').receivingApi;
  const controller = new AbortController();
  assert.equal(await api.nextCode(controller.signal), 'PN000010');
  assert.equal(calls[0][0], '/goods-receipts/next-code');
  assert.equal(calls[0][1].signal, controller.signal);
  for (const invalid of ['', ' ', 'X'.repeat(101), null]) {
    code = invalid;
    await assert.rejects(api.nextCode());
  }
});
test('putaway location queries request storage filtering and reject servers that ignore it', async () => {
  let sent;
  const location = { id: slotId, zoneCode: 'Z', rackCode: 'R', slotCode: 'S', displayPath: 'Kho / Kệ / S' };
  let result = { items: [location], totalCount: 1 };
  const api = sourceLoader({ '@/lib/api': { api: {
    get: async (...args) => { sent = args; return { data: { data: result } }; },
  }, unwrap: value => value.data.data } })('src/features/receiving/receiving.api.ts').receivingApi;
  await assert.rejects(api.locations(warehouseId, '', 1, undefined, false, true), /cập nhật BE/);
  assert.equal(sent[1].params.forPutAway, true);
  result = { items: [{ ...location, isPutAwayLocation: true }], totalCount: 1 };
  assert.equal((await api.locations(warehouseId, '', 1, undefined, false, true)).items[0].id, slotId);
  result = { items: [location], totalCount: 1 };
  assert.equal((await api.locations(warehouseId, '', 1)).items[0].id, slotId);
});
test('delivery photo submission refuses an older server rather than silently dropping attachments', async () => {
  let detail = {};
  const writes = [];
  const api = sourceLoader({ '@/lib/api': { api: {
    get: async () => ({ data: { data: detail } }),
    post: async (...args) => { writes.push(args); return { data: { data: null } }; },
  }, unwrap: value => value.data.data } })('src/features/receiving/receiving.api.ts').receivingApi;
  const body = { expectedVersion: 'AQ==', commandId: randomUUID(), receivingSlotId: sourceId, documentEvidenceIds: [randomUUID()] };
  await assert.rejects(api.submit(receiptId, body, () => {}), /chưa hỗ trợ lưu ảnh/);
  assert.equal(writes.length, 0);
  detail = { documentEvidence: [] };
  await api.submit(receiptId, body, () => {});
  assert.deepEqual(writes[0][1].documentEvidenceIds, body.documentEvidenceIds);
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
  assert.deepEqual(stored.selected, { id: slotId, slotCode: 'S01', displayPath: 'Khu nhận · Kệ R / S01' });
  assert.equal('zoneCode' in stored.selected, false);
});

const allocationLogic = load('src/features/receiving/putaway-allocation.ts');
function allocationReceipt() {
  const value = receipt();
  value.items[0] = { ...value.items[0], baseUnitName: 'Cái', enteredUnitId: unitId, putAwayPlan: [],
    allowedUnits: [{ unitId, unitName: 'Cái', quantityPrecision: 0, conversionFactor: 1 }] };
  return value;
}
function allocationDestination(id = slotId) { return { id, slotCode: 'S01', rackCode: 'R01', zoneCode: 'Z01', displayPath: 'Z01 / R01 / S01' }; }

test('putaway allocations prefill each product plan and leave only its unplanned remainder unassigned', () => {
  const value = allocationReceipt();
  value.items[0].putAwayPlan = [{ id: randomUUID(), slotId, slotCode: '__SYSTEM_DEFAULT__', rackCode: 'R01', isSystemDefaultSlot: true, quantity: 2 }];
  value.items.push({ ...value.items[0], id: randomUUID(), remainingPutAwayQuantity: 5, putAwayPlan: [] });
  const form = allocationLogic.buildPutawayAllocations(value);
  assert.equal(form.lines.length, 3);
  assert.deepEqual(form.lines.map(line => line.enteredQuantity), [2, 2, 5]);
  assert.equal(form.lines[0].destination.displayPath, 'Kệ R01');
  assert.equal(form.lines[1].destination, null);
  assert.equal(form.lines[2].destination, null);
});

test('putaway unit conversion uses exact precision and remaining input preserves base stock', () => {
  const base = { unitId, conversionFactor: 1, quantityPrecision: 0 };
  const box = { unitId: randomUUID(), conversionFactor: 10, quantityPrecision: 1 };
  assert.equal(allocationLogic.putawayBaseQuantity(0.3, box, base), 3);
  assert.equal(allocationLogic.putawayBaseQuantity(0.33, box, base), null);
  assert.equal(allocationLogic.putawayBaseQuantity(0.1, { ...box, conversionFactor: 0.1 }, base), null);
  assert.equal(allocationLogic.putawayBaseQuantity(Infinity, box, base), null);
  const item = { ...allocationReceipt().items[0], enteredUnitId: box.unitId, allowedUnits: [base, box] };
  assert.deepEqual(allocationLogic.putawayInput(item, 3), { enteredUnitId: box.unitId, enteredQuantity: 0.3 });
});

test('multi-slot putaway checks aggregate limits, duplicate locations and receipt eligibility', () => {
  const value = allocationReceipt();
  const initial = allocationLogic.buildPutawayAllocations(value);
  initial.lines[0].destination = allocationDestination();
  initial.lines[0].enteredQuantity = 2;
  initial.lines.push({ ...initial.lines[0], destination: allocationDestination(randomUUID()), enteredQuantity: 2 });
  assert.equal(allocationLogic.assertPutawayAllocation(initial, value, {}).fullyAllocated, 1);
  initial.lines[1].enteredQuantity = 3;
  assert.throws(() => allocationLogic.assertPutawayAllocation(initial, value, {}), /vượt/);
  initial.lines[1].enteredQuantity = 2;
  initial.lines[1].destination = initial.lines[0].destination;
  assert.throws(() => allocationLogic.assertPutawayAllocation(initial, value, {}), /đã có phân bổ/);
  initial.lines.pop(); initial.lines[0].destination = allocationDestination(sourceId);
  assert.throws(() => allocationLogic.assertPutawayAllocation(initial, value, {}), /khác vị trí nhận/);
  initial.lines[0].destination = allocationDestination();
  value.status = 'PendingApproval';
  assert.throws(() => allocationLogic.assertPutawayAllocation(initial, value, {}), /chưa đủ điều kiện/);
});

test('planned putaway requires a matching physical scan or a reason and detects off-plan quantity', () => {
  const value = allocationReceipt();
  value.items[0].putAwayPlan = [{ id: randomUUID(), slotId, slotCode: 'S01', rackCode: 'R01', isSystemDefaultSlot: false, quantity: 4 }];
  const form = allocationLogic.buildPutawayAllocations(value);
  assert.throws(() => allocationLogic.assertPutawayAllocation(form, value, {}), /Quét/);
  assert.equal(allocationLogic.assertPutawayAllocation(form, value, { [allocationLogic.putawayScanKey(form.lines[0])]: 'S01' }).confirmedCount, 1);
  form.overrideReason = 'Nhãn bị hỏng';
  assert.equal(allocationLogic.putawayAllocationState(form, value, {}).valid, false);
  assert.equal(allocationLogic.assertPutawayAllocation(form, value, {}, true).valid, true);
  form.lines[0].destination = allocationDestination(randomUUID());
  assert.equal(allocationLogic.putawayAllocationState(form, value, {}).rows[0].offPlan, true);
  form.overrideReason = '';
  assert.equal(allocationLogic.putawayAllocationState(form, value, {}).valid, false);
});

test('mobile scan resolution matches web for common labels, ambiguity, wrong destinations and unknown row barcodes', () => {
  const webSlot = sourceLoader()('../SSWMS-Frontend/src/components/operations/putaway/slot-code.ts');
  const webPlan = sourceLoader({
    '@/components/operations/putaway/slot-code': webSlot, './putaway-plan-draft': {}, './putaway-units': {},
  })('../SSWMS-Frontend/src/features/inbound/utils/putaway-plan.ts');
  const first = allocationDestination();
  first.slotBarcode = 'CUSTOM-01';
  const other = { ...allocationDestination(randomUUID()), slotCode: 'S02' };
  const slots = [first, other];
  const webSlots = slots.map(slot => ({ id: slot.id, code: slot.slotCode,
    scanCodes: [`${slot.zoneCode}-${slot.rackCode}-${slot.slotCode}`, `KOVIA:LOC:SLOT:${slot.id}`, slot.slotBarcode].filter(Boolean) }));
  const lines = [{ goodsReceiptItemId: lineId, destination: first }, { goodsReceiptItemId: randomUUID(), destination: first }];
  for (const code of [' S01 ', 's01', 'Z01-R01-S01', `KOVIA:LOC:SLOT:${first.id}`, 'CUSTOM-01', 'S02', 'UNKNOWN', '', '__SYSTEM_DEFAULT__']) {
    const expected = webPlan.matchScannedSlotCode(code, webSlots, lines.map((line, index) => ({ index, slotId: line.destination.id })));
    if (expected.status === 'error') assert.throws(() => allocationLogic.resolvePutawayScan(code, slots, lines, {}));
    else {
      const result = allocationLogic.resolvePutawayScan(code, slots, lines, {});
      assert.equal(result.index, expected.index); assert.equal(result.code, expected.code);
    }
    const expectedRow = webSlot.resolveSlotCode(code, webSlots, first.id);
    if (expectedRow.status === 'error') assert.throws(() => allocationLogic.resolvePutawayScan(code, slots, lines, {}, 0));
    else assert.equal(allocationLogic.resolvePutawayScan(code, slots, lines, {}, 0).code, expectedRow.code);
  }
  const duplicate = { ...other, slotCode: 'S01' };
  assert.throws(() => allocationLogic.resolvePutawayScan('S01', [first, duplicate], lines, {}, 0), /trùng/);
  assert.throws(() => allocationLogic.resolvePutawayScan('S02', slots, lines, {}), /không nằm trong phân bổ/);
  assert.equal(allocationLogic.resolvePutawayScan('UNKNOWN', slots, lines, {}, 0).serverCheck, true);
});

test('the same location must be scanned for each allocation row and repeat scans do not confirm everything', () => {
  const value = allocationReceipt();
  value.items[0].putAwayPlan = [{ id: randomUUID(), slotId, slotCode: 'S01', rackCode: 'R01', isSystemDefaultSlot: false, quantity: 4 }];
  value.items.push({ ...value.items[0], id: randomUUID() });
  const form = allocationLogic.buildPutawayAllocations(value);
  const scans = {};
  const warehouse = [form.lines[0].destination];
  let result = allocationLogic.resolvePutawayScan('S01', warehouse, form.lines, scans);
  assert.equal(result.index, 0);
  scans[allocationLogic.putawayScanKey(form.lines[result.index])] = result.code;
  let state = allocationLogic.putawayAllocationState(form, value, scans);
  assert.equal(state.requiredCount, 2); assert.equal(state.confirmedCount, 1); assert.equal(state.valid, false);
  result = allocationLogic.resolvePutawayScan('S01', warehouse, form.lines, scans);
  assert.equal(result.index, 1);
  scans[allocationLogic.putawayScanKey(form.lines[result.index])] = result.code;
  state = allocationLogic.putawayAllocationState(form, value, scans);
  assert.equal(state.confirmedCount, 2); assert.equal(state.valid, true);
  assert.throws(() => allocationLogic.resolvePutawayScan('S01', warehouse, form.lines, scans), /đã được quét/);
});

test('scan exceptions require explicit opt-out and use the same reason-group rule as BE/web', () => {
  const value = allocationReceipt();
  value.items[0].putAwayPlan = [{ id: randomUUID(), slotId, slotCode: 'S01', rackCode: 'R01', isSystemDefaultSlot: false, quantity: 4 }];
  const form = allocationLogic.buildPutawayAllocations(value);
  form.overrideReasonCode = 'LabelMismatch';
  assert.equal(allocationLogic.putawayAllocationState(form, value, {}, false).valid, false);
  assert.equal(allocationLogic.putawayAllocationState(form, value, {}, true).valid, true);
  form.overrideReasonCode = 'Other';
  assert.equal(allocationLogic.putawayAllocationState(form, value, {}, true).valid, false);
  form.overrideReason = 'Nhãn bị hỏng';
  assert.equal(allocationLogic.putawayAllocationState(form, value, {}, true).valid, true);
  const command = { commandId: randomUUID(), expectedVersion: 'AQ==', overrideReasonCode: 'Invalid', lines: [{ goodsReceiptItemId: lineId, slotId, quantity: 1 }] };
  assert.equal(schema.putAwayCommandSchema.safeParse(command).success, false);
});

test('rack scanning matches physical rack codes/QR and rejects the internal sentinel', () => {
  const destination = { ...allocationDestination(), slotCode: '__SYSTEM_DEFAULT__', rackId: randomUUID(), isSystemDefaultSlot: true };
  assert.equal(allocationLogic.matchesPutawayDestination('__SYSTEM_DEFAULT__', destination), false);
  assert.equal(allocationLogic.matchesPutawayDestination('R01', destination), true);
  assert.equal(allocationLogic.matchesPutawayDestination('Z01-R01', destination), true);
  assert.equal(allocationLogic.matchesPutawayDestination(`KOVIA:LOC:RACK:${destination.rackId}`, destination), true);
  assert.equal(allocationLogic.matchesPutawayDestination(`KOVIA:LOC:RACK:${randomUUID()}`, destination), false);
});

test('rack-level layouts provide scan identity and capacity even when child slots are absent', () => {
  const rackId = randomUUID();
  const layout = [{ id: randomUUID(), zoneCode: 'Z01', zoneName: 'Hàng khô', status: 'Active', racks: [
    { id: rackId, rackCode: 'R01', rackName: 'Kệ', status: 'Active', storageMode: 'RackLevel', isIsolationPoint: false,
      defaultSlotId: slotId, slots: [], capacityUsed: 2, capacity: 10, remainingCapacity: 8, capacityUnitName: 'Thùng' },
    { id: randomUUID(), rackCode: 'CL', status: 'Active', isIsolationPoint: true, slots: [] },
  ] }];
  const locations = allocationLogic.layoutDestinations(layout);
  assert.equal(locations.length, 1);
  assert.equal(locations[0].id, slotId);
  assert.equal(locations[0].rackId, rackId);
  assert.ok(locations[0].capacityLabel.includes('Còn 8'));
  assert.equal(locations[0].displayPath.includes('__SYSTEM_DEFAULT__'), false);
  assert.equal(allocationLogic.matchesPutawayDestination(`KOVIA:LOC:RACK:${rackId}`, locations[0]), true);
  assert.equal(allocationLogic.layoutDestinations([{ ...layout[0], isDefaultOutboundStagingPoint: true }]).length, 0);
  assert.equal(allocationLogic.layoutDestinations([{ ...layout[0], isDefaultIsolationPoint: true }]).length, 1);
  const mixed = { ...layout[0], isDefaultOutboundStagingPoint: true, isDefaultIsolationPoint: true,
    racks: [{ ...layout[0].racks[0], isOutboundStaging: false },
      { ...layout[0].racks[0], id: 'outbound-rack', defaultSlotId: 'outbound', isOutboundStaging: true },
      layout[0].racks[1],
      { id: 'slot-rack', rackCode: 'S', status: 'Active', storageMode: 'SlotLevel', slots: [
        { id: 'good-slot', slotCode: 'S01', isActive: true, capacity: null, capacityUsed: null, remainingCapacity: null },
        { id: 'outbound-slot', slotCode: 'S02', isActive: true, isOutboundStaging: true },
        { id: 'isolation-slot', slotCode: 'S03', isActive: true, isIsolationPoint: true },
      ] },
    ] };
  assert.deepEqual(allocationLogic.layoutDestinations([mixed]).map(location => location.id), [slotId, 'good-slot']);
});

test('batch putaway command accepts entered-unit rows and rejects mixed quantity modes and duplicates', () => {
  const body = { commandId: randomUUID(), expectedVersion: 'AQ==', lines: [{ goodsReceiptItemId: lineId, slotId, enteredQuantity: 0.5, enteredUnitId: unitId }] };
  assert.equal(schema.putAwayCommandSchema.safeParse(body).success, true);
  assert.equal(schema.putAwayCommandSchema.safeParse({ ...body, lines: [{ ...body.lines[0], quantity: 5 }] }).success, false);
  assert.equal(schema.putAwayCommandSchema.safeParse({ ...body, lines: [body.lines[0], body.lines[0]] }).success, false);
});

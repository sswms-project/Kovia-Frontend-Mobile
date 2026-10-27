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
    const output = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
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
const schema = load('src/features/stock-issue/stock-issue.schema.ts');
const logic = load('src/features/stock-issue/stock-issue.ts');
const notifications = load('src/features/notifications/notifications.ts');
const notificationSchema = load('src/features/notifications/notifications.schema.ts');
const countSchema = load('src/features/cycle-count/cycle-count.schema.ts');
const countLogic = load('src/features/cycle-count/cycle-count.ts');
const { P } = load('src/config/permission-codes.ts');
const { warehouseSnapshot } = load('src/features/warehouse-access/warehouse-access.ts');
const warehouseId = randomUUID(), userId = randomUUID(), documentId = randomUUID(), lineId = randomUUID(), stockId = randomUUID();
const values = () => ({ stockIssueRequestItemId: lineId, inventoryStockId: stockId, pickedQuantity: 2, scannedBarcode: 'SKU-01', scannedSlotCode: 'S-01' });
const document = () => ({ warehouseId, assignedStaffId: userId, items: [{ id: lineId, quantity: 5, pickedQuantity: 1, barcode: 'SKU-01', conversionFactor: 1,
  pickLocations: [{ inventoryStockId: stockId, slotCode: 'S-01', reservedQuantity: 3 }], pickDetails: [{ id: 'picked', pickedQuantity: 1, issuedAt: null }, { id: 'issued', pickedQuantity: 1, issuedAt: '2026-10-20' }] }] });
const profile = () => ({ id: userId, tenantId: randomUUID(), status: 'Active', assignedWarehouses: [{ id: warehouseId, status: 'Active' }],
  permissions: [P.NOTIFICATIONS_VIEW, P.STOCK_ISSUE_REQUESTS_VIEW] });
test('picking requires actual positive quantity, source confirmation and versioned unique command', () => {
  assert.ok(schema.pickFormSchema.safeParse(values()).success);
  for (const pickedQuantity of [0, -1, NaN, Infinity]) assert.equal(schema.pickFormSchema.safeParse({ ...values(), pickedQuantity }).success, false);
  assert.equal(schema.pickFormSchema.safeParse({ ...values(), scannedSlotCode: ' ' }).success, false);
  assert.equal(schema.pickingCommandSchema.safeParse({ items: [values()] }).success, false);
  assert.equal(schema.dispatchCommandSchema.safeParse({ expectedVersion: 'AQ==', commandId: randomUUID(), pickDetailIds: [lineId, lineId] }).success, false);
});
test('scope guard rejects another warehouse, unassigned and another staff', () => {
  logic.assertStockIssueScope(document(), warehouseId, userId);
  for (const change of [{ warehouseId: randomUUID() }, { assignedStaffId: null }, { assignedStaffId: randomUUID() }])
    assert.throws(() => logic.assertStockIssueScope({ ...document(), ...change }, warehouseId, userId));
});
test('picking validates remaining reservation, line, product scan and package multiples without rounding', () => {
  logic.assertPick(values(), document());
  for (const change of [{ pickedQuantity: 4 }, { pickedQuantity: 0.001 }, { stockIssueRequestItemId: randomUUID() },
    { inventoryStockId: randomUUID() }, { scannedBarcode: 'SKU01' }]) assert.throws(() => logic.assertPick({ ...values(), ...change }, document()));
  const packed = document(); packed.items[0].conversionFactor = 3;
  assert.throws(() => logic.assertPick(values(), packed)); logic.assertPick({ ...values(), pickedQuantity: 3 }, packed);
});
test('dispatch selects only staged details not already issued', () => {
  assert.deepEqual(logic.outstandingPicks(document()).map(detail => detail.id), ['picked']);
});
test('command retry preserves UUID only for identical document/action/version/content', () => {
  const { warehouseCommand } = load('src/lib/warehouse-command.ts');
  const body = { id: documentId, action: 'Pick', expectedVersion: 'AQ==', quantity: 2 };
  const first = warehouseCommand(null, body);
  assert.equal(warehouseCommand(first, body), first);
  for (const change of [{ id: lineId }, { action: 'Dispatch' }, { expectedVersion: 'Ag==' }, { quantity: 3 }])
    assert.notEqual(warehouseCommand(first, { ...body, ...change }).commandId, first.commandId);
});
test('write wrapper checks context before request, inside interceptor and after response', async () => {
  let sent, checks = 0;
  const api = sourceLoader({ '@/lib/api': { api: { post: async (...args) => { sent = args; args[2].assertCurrentContext(); return { data: { data: null } }; } }, unwrap: response => response.data.data } })('src/features/stock-issue/stock-issue.api.ts').stockIssueApi;
  await api.pick(documentId, { expectedVersion: 'AQ==', commandId: randomUUID(), items: [values()] }, () => { checks++; });
  assert.equal(checks, 3); assert.equal(sent[0], `/stock-issue-requests/${documentId}/picks`);
  await assert.rejects(api.dispatch(documentId, { expectedVersion: 'AQ==', commandId: randomUUID(), pickDetailIds: [lineId] }, () => { throw new Error('revoked'); }), /revoked/);
});
test('notification context is account/tenant/status/permission bound without requiring selected warehouse', () => {
  const user = profile(); const snapshot = warehouseSnapshot(user);
  notifications.assertNotificationContext(snapshot.identity, snapshot.signature, user, true);
  for (const changed of [{ ...user, id: randomUUID() }, { ...user, tenantId: randomUUID() }, { ...user, status: 'Inactive' }, { ...user, permissions: [] }])
    assert.throws(() => notifications.assertNotificationContext(snapshot.identity, snapshot.signature, changed, true));
  assert.throws(() => notifications.assertNotificationContext(snapshot.identity, snapshot.signature, user, false));
});
test('notification navigation permits known document types only and never external payload URLs', () => {
  const user = profile();
  const item = { referenceType: 'StockIssueRequest', referenceId: documentId, action: 'https://bad.invalid' };
  assert.equal(notifications.notificationDestination(item, user).params.id, documentId);
  for (const referenceType of ['https://bad.invalid', 'TransferRequest', null, 'Unknown'])
    assert.equal(notifications.notificationDestination({ ...item, referenceType }, user), null);
  assert.equal(notifications.notificationDestination(item, { ...user, permissions: [] }), null);
});
test('notification response never substitutes missing counts/read state with zeros or false', () => {
  const item = { id: randomUUID(), type: 'StockIssueRequestUpdate', title: 'Thông báo', message: 'Nội dung', isRead: false,
    referenceType: null, referenceId: null, action: null, createdAt: '2026-10-20T01:00:00+07:00' };
  assert.ok(notificationSchema.notificationListSchema.safeParse({ items: [item], totalCount: 1, pageNumber: 1, pageSize: 20 }).success);
  assert.equal(notificationSchema.notificationListSchema.safeParse({ items: [item], pageNumber: 1, pageSize: 20 }).success, false);
  assert.equal(notificationSchema.notificationSchema.safeParse({ ...item, isRead: undefined }).success, false);
});
const countValues = () => ({ countedQuantity: 0, countedDamagedQuantity: 0, note: '', countMethod: 'Manual', scannedBarcode: '', damageReason: '', damageEvidenceIds: [] });
const countItem = () => ({ id: lineId, productSku: 'SKU-01', productBarcode: 'BAR-01', countedQuantity: null,
  systemQuantity: null, difference: null, snapshotCapturedAt: '2026-10-20T01:00:00Z', requestedRecountRound: null, countHistory: [], damageEvidence: [] });
const countDocument = () => ({ warehouseId, assignedTo: userId, isBlindCount: true, status: 'Counting', recountRound: 0, items: [countItem()] });
test('count form allows explicit zero, rejects blank/negative/nonfinite and overprecision', () => {
  assert.ok(countSchema.countFormSchema.safeParse(countValues()).success);
  for (const countedQuantity of [NaN, Infinity, -1, 0.001]) assert.equal(countSchema.countFormSchema.safeParse({ ...countValues(), countedQuantity }).success, false);
  assert.equal(countSchema.countFormSchema.safeParse({ ...countValues(), countedQuantity: 1, countedDamagedQuantity: 2 }).success, false);
});
test('blind count rejects exposed current or historical system quantities and foreign scope', () => {
  countLogic.assertCountScope(countDocument(), warehouseId, userId);
  assert.throws(() => countLogic.assertCountScope({ ...countDocument(), warehouseId: stockId }, warehouseId, userId));
  assert.throws(() => countLogic.assertCountScope({ ...countDocument(), items: [{ ...countItem(), systemQuantity: 10 }] }, warehouseId, userId));
  assert.throws(() => countLogic.assertCountScope({ ...countDocument(), items: [{ ...countItem(), countHistory: [{ systemQuantity: 10 }] }] }, warehouseId, userId));
});
test('count records only an uncounted snapshot in the current recount round', () => {
  assert.ok(countLogic.canRecordCountItem(countDocument(), countItem()));
  assert.equal(countLogic.canRecordCountItem(countDocument(), { ...countItem(), snapshotCapturedAt: null }), false);
  assert.equal(countLogic.canRecordCountItem(countDocument(), { ...countItem(), countedQuantity: 0 }), false);
  assert.equal(countLogic.canRecordCountItem({ ...countDocument(), status: 'Submitted' }, countItem()), false);
  assert.equal(countLogic.canRecordCountItem({ ...countDocument(), status: 'Recount', recountRound: 2 }, { ...countItem(), requestedRecountRound: 1 }), false);
  assert.ok(countLogic.canRecordCountItem({ ...countDocument(), status: 'Recount', recountRound: 2 }, { ...countItem(), requestedRecountRound: 2 }));
});
test('count damage is inside actual quantity and needs a reason plus evidence, scan accepts SKU or barcode', () => {
  assert.equal(countSchema.countFormSchema.safeParse({ ...countValues(), countedQuantity: 2, countedDamagedQuantity: 1 }).success, false);
  const damaged = { ...countValues(), countedQuantity: 2, countedDamagedQuantity: 1, damageReason: 'Hỏng bề mặt' };
  assert.throws(() => countLogic.assertCountRecord(countDocument(), countItem(), damaged));
  countLogic.assertCountRecord(countDocument(), countItem(), { ...damaged, damageEvidenceIds: [lineId] });
  for (const scannedBarcode of ['SKU-01', 'BAR-01']) countLogic.assertCountRecord(countDocument(), countItem(), { ...countValues(), countMethod: 'Scanned', scannedBarcode });
  assert.throws(() => countLogic.assertCountRecord(countDocument(), countItem(), { ...countValues(), countMethod: 'Scanned', scannedBarcode: 'WRONG' }));
});

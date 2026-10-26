const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.dirname(require.resolve('../package.json'));
function loader(overrides = {}) {
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
const load = loader();
const scans = load('src/features/scanner/warehouse-scan.ts');
const pick = load('src/features/transfer-picking/transfer-picking.schema.ts');
const pickRules = load('src/features/transfer-picking/transfer-picking.ts');
const receipt = load('src/features/transfer-receiving/transfer-execution.schema.ts');
const receiptRules = load('src/features/transfer-receiving/transfer-receiving.ts');
const issue = load('src/features/stock-issue/stock-issue.schema.ts');
const issueRules = load('src/features/stock-issue/stock-issue.ts');
const transferId = randomUUID(), shipmentId = randomUUID(), slotId = randomUUID(), rackId = randomUUID();
const lineId = randomUUID(), stockId = randomUUID();
const location = { slotId, slotCode: 'S01', rackCode: 'R01', rackId, zoneCode: 'Z01', slotBarcode: 'CUSTOM-LABEL', isSystemDefaultSlot: false };
const base = { expectedVersion: 'AQ==', commandId: randomUUID() };

test('slot QR, custom barcode, composite labels match web/BE; unrelated labels are rejected', () => {
  for (const code of ['s01', ' CUSTOM-label ', `KOVIA:LOC:SLOT:${slotId}`, 'Z01-R01-S01'])
    assert.equal(scans.matchesWarehouseLocation(code, location), true, code);
  for (const code of ['', 'SKU01', 'Z02-R01-S01', `KOVIA:LOC:SLOT:${randomUUID()}`, `KOVIA:LOC:RACK:${rackId}`])
    assert.equal(scans.matchesWarehouseLocation(code, location), false, code);
});
test('rack-managed locations accept rack QR/code without exposing internal default slot as another physical bin', () => {
  const source = { ...location, isSystemDefaultSlot: true, slotCode: '__SYSTEM_DEFAULT__' };
  for (const code of ['R01', 'Z01-R01', `KOVIA:LOC:RACK:${rackId}`, `KOVIA:LOC:SLOT:${slotId}`])
    assert.equal(scans.matchesWarehouseLocation(code, source), true);
  assert.equal(scans.matchesWarehouseLocation(`KOVIA:LOC:RACK:${randomUUID()}`, source), false);
});
test('pending scans add only actual confirmed counts, honor package snapshots and never exceed remaining reservation', () => {
  assert.equal(scans.nextScanQuantity(2, 3, 1, 5), 5);
  assert.equal(scans.nextScanQuantity(0, 2, 12, 24), 24);
  assert.equal(scans.nextScanQuantity(0, 3, 12, 24), null);
  assert.equal(scans.nextScanQuantity(0.1, 2, 0.1, 0.3), 0.3);
  for (const args of [[5,1,1,5], [0,1,0.001,2], [0,-1,1,2], [NaN,1,1,2], [0,0.5,1,2], [0,1,0,2]])
    assert.equal(scans.nextScanQuantity(...args), null);
});
test('outbound source scan is checked before submit and staging scan stays optional as in BE', () => {
  const values = { stockIssueRequestItemId: lineId, inventoryStockId: stockId, pickedQuantity: 2,
    scannedBarcode: 'BARCODE', scannedSlotCode: `KOVIA:LOC:SLOT:${slotId}`, destinationStagingSlotId: randomUUID() };
  const document = { items: [{ id: lineId, sku: 'SKU', barcode: 'BARCODE', quantity: 5, pickedQuantity: 1, conversionFactor: 1,
    pickLocations: [{ ...location, inventoryStockId: stockId, reservedQuantity: 3 }] }] };
  assert.ok(issue.pickingCommandSchema.safeParse({ ...base, items: [values] }).success);
  issueRules.assertPick(values, document);
  assert.throws(() => issueRules.assertPick({ ...values, scannedSlotCode: `KOVIA:LOC:SLOT:${randomUUID()}` }, document));
  // The API DTO omits custom location barcodes: preserve them and let BE reject an actual mismatch.
  issueRules.assertPick({ ...values, scannedSlotCode: 'CUSTOM-LABEL' }, document);
  assert.throws(() => issueRules.assertPick({ ...values, scannedBarcode: 'SKU' }, document));
});
test('transfer picking rejects fractional indivisible units, mismatched source and reservation overrun', () => {
  const sheet = { lines: [{ lineId, sku: 'SKU', productBarcode: 'BAR', baseQuantityPrecision: 0, status: 'Picking', remainingQuantity: 3,
    suggestions: [{ ...location, inventoryStockId: stockId, reservedQuantity: 3, suggestedQuantity: 3 }] }] };
  const values = { lineId, inventoryStockId: stockId, quantity: 2, scannedSlotCode: 'Z01-R01-S01', scannedProductCode: 'SKU' };
  pickRules.assertTransferPick(values, sheet);
  for (const change of [{ quantity: 2.5 }, { quantity: 4 }, { scannedSlotCode: 'WRONG' }, { scannedProductCode: 'WRONG' }])
    assert.throws(() => pickRules.assertTransferPick({ ...values, ...change }, sheet));
});
test('completion sends staging destination and command ID; missing version/command cannot leave picking', () => {
  const body = { transferId, shipmentId, ...base, outboundStagingSlotId: slotId };
  assert.ok(pick.transferCompleteCommandSchema.safeParse(body).success);
  assert.equal(pick.transferCompleteCommandSchema.safeParse({ ...body, commandId: undefined }).success, false);
  assert.equal(pick.transferCompleteCommandSchema.safeParse({ ...body, expectedVersion: '' }).success, false);
});
test('receipt actions match mode, task state and explicit optional-putaway resume', () => {
  const allowed = receiptRules.transferReceiptActionAllowed;
  assert.equal(allowed('Receive','Start','InTransit','Queued',false), true);
  assert.equal(allowed('Receive','Submit','Receiving','InProgress',false), true);
  assert.equal(allowed('PutAway','PutAway','AwaitingPutAway','Queued',false), true);
  for (const state of ['Paused','Cancelled','Completed',null]) assert.equal(allowed('Receive','Submit','Receiving',state,false), false);
  assert.equal(allowed('Receive','PutAway','AwaitingPutAway','Queued',false), false);
  assert.equal(allowed('PutAway','Resume','Received','Cancelled',true), true);
  assert.equal(allowed('PutAway','Resume','Received','Cancelled',false), false);
});
test('staged receiving accepts configured point without an unnecessary scan; putaway respects BE 100-char limit', () => {
  assert.ok(receipt.startTransferReceivingSchema.safeParse({ ...base, receivingSlotId: slotId }).success);
  assert.ok(receipt.startTransferReceivingSchema.safeParse({ ...base, receivingSlotId: slotId, scannedSlotCode: 'S01' }).success);
  const entry = { lineId, lotId:null, qualityStatus:'Good', destinationSlotId:slotId, quantity:1,
    scannedSlotCode:'S01', scannedProductCode:'SKU', deviationReasonCode:null, note:null, slotCodeUnreadable:false };
  assert.ok(receipt.putAwayTransferSchema.safeParse({ ...base, planVersion:'plan1', entries:[entry] }).success);
  assert.equal(receipt.putAwayTransferSchema.safeParse({ ...base, planVersion:'plan1', entries:[{ ...entry, scannedProductCode:'x'.repeat(101) }] }).success, false);
});
test('dispatch command can contain only the actually departing subset and rejects duplicate/overlarge selections', () => {
  assert.ok(issue.dispatchCommandSchema.safeParse({ ...base, pickDetailIds:[lineId] }).success);
  for (const ids of [[], [lineId,lineId], Array.from({length:501},randomUUID)])
    assert.equal(issue.dispatchCommandSchema.safeParse({ ...base, pickDetailIds:ids }).success, false);
});
test('transfer APIs serialize exact completion/resume paths and preserve guards', async () => {
  const sent = []; let guards = 0;
  const apiOverride = { api: { post: async (...args) => { sent.push(args); args[2].assertCurrentContext(); return { data:{ data:null } }; } }, unwrap: response => response.data.data };
  const apiLoad = loader({ '@/lib/api':apiOverride });
  const complete = apiLoad('src/features/transfer-picking/transfer-picking.api.ts').transferPickingApi;
  await complete.complete({ transferId,shipmentId,...base,outboundStagingSlotId:slotId },()=>{ guards++; });
  assert.equal(sent[0][0],`/transfers/${transferId}/shipments/${shipmentId}/complete-picking`);
  assert.equal(sent[0][1].outboundStagingSlotId,slotId); assert.equal(sent[0][1].commandId,base.commandId); assert.equal(guards,3);
  const receiving = apiLoad('src/features/transfer-receiving/transfer-receiving.api.ts').transferReceivingApi;
  await receiving.execute(transferId,shipmentId,{ action:'Resume',body:base },()=>{ guards++; });
  assert.equal(sent[1][0],`/transfers/${transferId}/shipments/${shipmentId}/resume-putaway`);
  await assert.rejects(receiving.execute(transferId,shipmentId,{ action:'Start',body:{...base,receivingSlotId:slotId} },()=>{throw new Error('revoked');}),/revoked/);
});

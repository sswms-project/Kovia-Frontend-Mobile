const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');

function load(relative, overrides) {
  overrides = {
    '@/components/work-screen-header': { WorkScreenHeader: 'WorkScreenHeader' },
    '@/hooks/use-screen-exit': { useScreenExit: () => null, useExitProtection() {}, useModalExit: close => close },
    './use-screen-exit': { useScreenExit: () => null, useExitProtection() {}, useModalExit: close => close },
    'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_, value) => require('node:crypto').createHash('sha256').update(value).digest('hex') },
    ...overrides,
  };
  const filename = path.resolve(__dirname, '..', relative);
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(
    name => Object.hasOwn(overrides, name) ? overrides[name] : require(name), module, module.exports,
  );
  return module.exports;
}

function hooks() {
  const slots = [];
  let cursor = 0;
  let effects = [];
  return {
    react: {
      memo: component => component,
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
        return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
      },
      useRef(initial) {
        const index = cursor++;
        return slots[index] ??= { current: initial };
      },
      useEffect(effect, dependencies) {
        const index = cursor++, previous = slots[index];
        if (!dependencies || !previous || dependencies.some((value, key) => value !== previous.dependencies[key]))
          effects.push(() => { previous?.cleanup?.(); slots[index] = { dependencies, cleanup: effect() }; });
      },
    },
    render(callback) { cursor = 0; effects = []; const result = callback(); effects.forEach(effect => effect()); return result; },
  };
}

test('damage destination search must include configured isolation locations', async () => {
  let query;
  const { transferReceivingApi } = load('src/features/transfer-receiving/transfer-receiving.api.ts', {
    '@/lib/api': { api: { get: async (_, config) => { query = config.params; return []; } }, unwrap: value => value },
    '@/lib/dotnet-guid.schema': { nonEmptyDotNetGuidSchema: () => ({ parse: value => value }) },
    './transfer-receiving': {}, './transfer-receiving.schema': {},
    './transfer-execution.schema': { transferExecutionSlotsSchema: { parse: value => value } },
  });
  await transferReceivingApi.slots('warehouse', 'ISOLATION', undefined, true);
  assert.equal(query.includeIsolation, true, 'BE excludes isIsolationPoint slots without includeIsolation=true');
});

test('restoring a transfer receipt draft must retain the choice to put goods away instead of keeping at receiving', () => {
  const jsx = (type, props) => ({ type, props });
  const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes)
    : [node, ...nodes(node.props?.children), ...nodes(node.props?.ListHeaderComponent), ...nodes(node.props?.ListFooterComponent)];
  const state = { canView: true, access: { profile: { data: { permissions: ['receive'] } } }, data: {
    receipt: { version: 'AQ==', status: 'Receiving', receiptFlowVersion: 2, lines: [] },
    document: { destinationWarehouseId: 'warehouse' },
  } };
  function mount() {
    const runtime = hooks();
    const form = { values: {}, formState: { errors: {}, isDirty: true }, reset(values) { this.values = structuredClone(values); },
      getValues() { return this.values; }, setValue(name, value) { this.values[name] = value; } };
    form.control = form;
    const { TransferReceiptEditor } = load('src/features/transfer-receiving/components/transfer-receipt-editor.tsx', {
      react: runtime.react, 'react/jsx-runtime': { jsx, jsxs: jsx },
      '@hookform/resolvers/zod': { zodResolver: () => undefined },
      'react-hook-form': { useForm: options => { if (!Object.keys(form.values).length) form.reset(options.defaultValues); return form; },
        useWatch: ({ control, name }) => control.values[name] },
      'react-native': { FlatList: 'FlatList', Modal: 'Modal', View: 'View', Text: 'Text',
        KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' }, StyleSheet: { create: value => value } },
      'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
      '@/components/ui/alert-banner': { AlertBanner: 'AlertBanner' }, '@/components/ui/button': { Button: 'Button' },
      '@/components/ui/text-field': { TextField: 'TextField' }, '@/components/ui/selection-field': { SelectionField: 'SelectionField' }, '@/components/work-action-bar': { WorkActionBar: 'WorkActionBar' }, '@/components/ui/confirmation-modal': { ConfirmationModal: 'ConfirmationModal' },
      '@/constants/theme': { FontFamily: {} }, '@/hooks/use-theme': { useTheme: () => ({}) },
      '@/hooks/use-form-draft': { useFormDraft: () => ({}) }, '@/config/permission-codes': { P: { TRANSFERS_RECEIVE: 'receive' } },
      '@/features/warehouse-access/components/staging-point-field': { StagingPointField: 'StagingPointField' },
      '@/features/scanner/components/scan-code-button': { ScanCodeButton: 'ScanCodeButton' },
      '@/features/scanner/components/scan-count-button': { ScanCountButton: 'ScanCountButton' },
      '@/features/scanner/warehouse-scan': {}, '../transfer-execution.schema': {}, '../transfer-receiving.api': {},
      '../hooks/use-transfer-receipt-execution': { useTransferReceiptExecution: () => ({ key: 'context', allowed: () => true, mutation: { isPending: false } }) },
      './transfer-location-selector': { TransferLocationSelector: 'TransferLocationSelector' },
    });
    const render = () => nodes(runtime.render(() => TransferReceiptEditor({ state, transferId: 'transfer', shipmentId: 'shipment', mode: 'Receive', children: controls => controls })));
    const open = render().find(node => node.type === 'Button' && node.props.label === 'Ghi số thực nhận tốt / hỏng / thiếu');
    open.props.onPress();
    return { form, render };
  }
  const original = mount();
  original.render().find(node => node.type === 'SelectionField' && node.props.label === 'Xử lý hàng đạt').props.onChange('putaway');
  assert.ok(original.render().some(node => node.type === 'SelectionField' && node.props.label === 'Xử lý hàng đạt' && node.props.value === 'putaway'));
  const savedValues = structuredClone(original.form.getValues());
  // useFormDraft persists/restores only form.getValues(); scans must be confirmed again separately.
  const restored = mount(); restored.form.reset(savedValues);
  assert.ok(restored.render().some(node => node.type === 'SelectionField' && node.props.label === 'Xử lý hàng đạt' && node.props.value === 'putaway'),
    'Recovered counts must not silently reset receipt disposition to keep-at-receiving');
});

const scanRules = load('src/features/scanner/warehouse-scan.ts', {});
const allocation = load('src/features/transfer-receiving/transfer-putaway-allocation.ts', {
  '@/features/scanner/warehouse-scan': scanRules,
});
function allocationFixture() {
  const itemId = randomUUID(), lineId = randomUUID(), first = randomUUID(), second = randomUUID();
  const row = { itemId, lineId, lotId: null, qualityStatus: 'Good', sku: 'SKU-A', baseQuantityPrecision: 0,
    remainingQuantity: 5, planMode: 'Planned', planBudgets: [
      { slotId: first, slotCode: 'A1', path: 'Khu A / A1', remainingBudget: 3 },
      { slotId: second, slotCode: 'A2', path: 'Khu A / A2', remainingBudget: 2 },
    ] };
  const sheet = { rows: [row], receipt: { lines: [{ lineId, sku: 'SKU-A', barcode: 'BAR-A' }] } };
  const form = allocation.buildTransferAllocations(sheet.rows);
  const scans = Object.fromEntries(form.lines.map((line, index) => [`${index}:${line.destination.id}`, { slot: line.destination.code, product: 'BAR-A' }]));
  return { row, sheet, form, scans, first, second };
}
test('planned transfer putaway splits locations and consumes a shared item budget only once across lots', () => {
  const f = allocationFixture();
  assert.deepEqual(f.form.lines.map(line => line.quantity), ['3', '2']);
  const rows = [{ ...f.row, remainingQuantity: 3 }, { ...f.row, lotId: randomUUID(), remainingQuantity: 4 }];
  const form = allocation.buildTransferAllocations(rows);
  assert.deepEqual(form.lines.map(line => [line.destination?.code ?? null, line.quantity]), [['A1', '3'], ['A2', '2'], [null, '2']]);
});
test('suggestion allocations are advisory, shared across lots, and leave unavailable capacity unassigned', () => {
  const f = allocationFixture();
  const form = allocation.buildTransferAllocations([{ ...f.row, remainingQuantity: 3 }, { ...f.row, lotId: randomUUID(), remainingQuantity: 3 }],
    { items: [{ itemId: f.row.itemId, suggestions: [{ slotId: f.first, slotCode: 'A1', path: 'A1', suggestedQuantity: 4 }] }] });
  assert.deepEqual(form.lines.map(line => [line.destination?.code ?? null, line.quantity]), [['A1', '3'], ['A1', '1'], [null, '2']]);
});
test('batch confirmation rejects aggregate overruns, duplicate destinations and fractional pieces', () => {
  const f = allocationFixture();
  assert.equal(allocation.transferAllocationEntries(f.form, f.sheet, f.scans).length, 2);
  assert.throws(() => allocation.transferAllocationEntries({ lines: [f.form.lines[0], { ...f.form.lines[1], quantity: '3' }] }, f.sheet, f.scans), /vượt/);
  assert.throws(() => allocation.transferAllocationEntries({ lines: [f.form.lines[0], { ...f.form.lines[0], quantity: '1' }] }, f.sheet, f.scans), /trùng/);
  assert.throws(() => allocation.transferAllocationEntries({ lines: [{ ...f.form.lines[0], quantity: '1.5' }] }, f.sheet, f.scans), /đơn vị/);
});
test('off-plan entries require a reason and each allocation must confirm its own location and product', () => {
  const f = allocationFixture();
  const other = randomUUID();
  const form = { lines: [{ ...f.form.lines[0], destination: { id: other, code: 'B1', path: 'B1' }, quantity: '2' }] };
  assert.throws(() => allocation.transferAllocationEntries(form, f.sheet, {}), /lý do/);
  form.lines[0].reasonCode = 'Other'; form.lines[0].note = 'Vị trí kế hoạch bị chắn';
  assert.throws(() => allocation.transferAllocationEntries(form, f.sheet, {}), /xác nhận mã/);
  assert.throws(() => allocation.transferAllocationEntries(form, f.sheet, { [`0:${other}`]: { slot: 'B1', product: 'OTHER' } }), /sản phẩm/);
  assert.equal(allocation.transferAllocationEntries(form, f.sheet, { [`0:${other}`]: { slot: 'B1', product: 'BAR-A' } })[0].deviationReasonCode, 'Other');
});
test('batch payload retains BE version, exact command identity and multiple placements', () => {
  const schema = load('src/features/transfer-receiving/transfer-execution.schema.ts', {
    '@/lib/dotnet-guid.schema': { nonEmptyDotNetGuidSchema: () => require('zod').z.string().uuid() },
  });
  const f = allocationFixture();
  const body = { expectedVersion: 'AQ==', commandId: randomUUID(), planVersion: 'plan-v1',
    entries: allocation.transferAllocationEntries(f.form, f.sheet, f.scans) };
  assert.ok(schema.putAwayTransferSchema.safeParse(body).success);
  assert.equal(schema.putAwayTransferSchema.safeParse({ ...body, expectedVersion: '' }).success, false);
  const draft = { action: 'Receipt', counts: {}, scan: '', damageScan: '', productScan: '', putQuantity: '', note: '' };
  assert.equal(schema.transferReceiptDraftSchema.safeParse(draft).success, false);
  assert.equal(schema.transferReceiptDraftSchema.parse({ ...draft, keepAtReceiving: false }).keepAtReceiving, false);
});

function allocationHook() {
  const runtime = hooks(), fixture = allocationFixture(), prepared = [], asserted = [];
  const state = { canView: true, mode: 'PutAway', data: { receipt: { version: 'receipt-v1', lines: fixture.sheet.receipt.lines },
    document: { destinationWarehouseId: 'warehouse' }, putAway: { ...fixture.sheet, planVersion: 'plan-v1' } } };
  let draftOptions, resolveSlot = async (_, code) => fixture.form.lines.find(line => line.destination.code === code)?.destination ?? null;
  const form = { values: { lines: [] }, formState: { isDirty: false },
    reset(values) { this.values = structuredClone(values); },
    getValues(name) { return name ? name.split('.').reduce((value, key) => value[key], this.values) : this.values; },
    setValue(name, value) { const keys = name.split('.'), leaf = keys.pop(); keys.reduce((value, key) => value[key], this.values)[leaf] = value; },
    handleSubmit(callback) { return async () => callback(this.values); } };
  form.control = form;
  const execution = { key: 'scope', mutation: { isPending: false }, allowed: () => true, target: null,
    assertCurrent: version => asserted.push(version), prepare: value => prepared.push(value), cancel() {} };
  const { useTransferPutawayAllocation } = load('src/features/transfer-receiving/hooks/use-transfer-putaway-allocation.ts', {
    react: runtime.react, '@hookform/resolvers/zod': { zodResolver: () => undefined },
    '@tanstack/react-query': { useQuery: () => ({ refetch: async () => ({ data: {} }) }) },
    'react-hook-form': { useForm: () => form, useWatch: ({ name }) => form.values[name], useFieldArray: () => ({
      replace: lines => { form.values.lines = structuredClone(lines); }, append: line => form.values.lines.push(line), remove: index => form.values.lines.splice(index, 1) }) },
    '@/hooks/use-form-draft': { useFormDraft: options => { draftOptions = options; return {}; } },
    '@/lib/api-error': { getApiErrorMessage: error => error.message }, '@/features/scanner/warehouse-scan': scanRules,
    '../transfer-execution.schema': {}, '../transfer-putaway-allocation': allocation,
    '../transfer-receiving.api': { transferReceivingApi: { resolveSlot: (...args) => resolveSlot(...args) } },
    './use-transfer-receipt-execution': { useTransferReceiptExecution: () => execution },
  });
  return { fixture, state, prepared, asserted, execution, get draft() { return draftOptions; },
    resolveWith: callback => { resolveSlot = callback; },
    render: () => runtime.render(() => useTransferPutawayAllocation(state, 'transfer', 'shipment')) };
}

test('refreshed transfer plan blocks batch review without discarding input; explicit resume still has a usable draft scope', async () => {
  const h = allocationHook(); h.render().open();
  const opened = h.render();
  opened.form.setValue('lines.0.quantity', '2');
  assert.equal(h.draft.version, 'receipt-v1:plan-v1');
  h.state.data = { ...h.state.data, putAway: { ...h.state.data.putAway, planVersion: 'plan-v2' } };
  const stale = h.render();
  assert.equal(stale.stale, true); assert.equal(stale.locked, true);
  await stale.review(); assert.equal(h.prepared.length, 0);
  assert.equal(h.render().form.getValues('lines.0.quantity'), '2');
  const resume = allocationHook();
  resume.execution.target = { action: 'Resume', body: { expectedVersion: 'receipt-v1' } };
  resume.render(); assert.equal(resume.draft.enabled, true); assert.equal(resume.draft.version, 'receipt-v1');
  resume.draft.assertCurrent(); assert.deepEqual(resume.asserted, ['receipt-v1']);
});

test('location confirmations ignore superseded labels and version changes, while independent rows can finish concurrently', async () => {
  const h = allocationHook(); h.render().open();
  let pending = [];
  h.resolveWith((_, code) => new Promise(resolve => pending.push({ code, resolve })));
  let screen = h.render();
  const old = screen.scanSlot(0, 'A1');
  screen.changeScan(0, 'NEW'); pending.shift().resolve(h.fixture.form.lines[0].destination);
  assert.equal(await old, false); assert.equal(h.render().scans[`0:${h.fixture.first}`]?.slot ?? '', '');
  screen = h.render();
  const first = screen.scanSlot(0, 'A1'), second = screen.scanSlot(1, 'A2');
  pending[1].resolve(h.fixture.form.lines[1].destination); pending[0].resolve(h.fixture.form.lines[0].destination);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(h.render().scans[`0:${h.fixture.first}`].slot, 'A1');
  assert.equal(h.render().scans[`1:${h.fixture.second}`].slot, 'A2');
  pending = []; const obsolete = h.render().scanSlot(0, 'A1');
  h.state.data = { ...h.state.data, receipt: { ...h.state.data.receipt, version: 'receipt-v2' } }; h.render();
  pending[0].resolve(h.fixture.form.lines[0].destination);
  assert.equal(await obsolete, false); assert.equal(h.prepared.length, 0);
});

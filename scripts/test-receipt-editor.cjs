const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

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
      useEffect(effect) { effects.push(effect); },
    },
    render(callback) { cursor = 0; effects = []; const result = callback(); effects.forEach(effect => effect()); return result; },
  };
}

const inventoryLabels = load('src/features/inventory/inventory.labels.ts', {
  '@/lib/number-format': { formatQuantity: String }, './inventory.types': { STOCK_MOVEMENT_TYPES: {} },
});

test('allocation location picker uses warehouse layout data, selects the scanned identity and reports scan errors', () => {
  const runtime = hooks(); const chosen = [];
  const jsx = (type, props) => ({ type, props });
  const destinations = [{ id: 'staging', slotCode: 'S0', displayPath: 'Khu nhận' }, { id: 'rack-slot', rackId: 'rack', slotCode: '__SYSTEM_DEFAULT__', displayPath: 'Kệ A07', capacityLabel: 'Còn 26 Thùng' }];
  const state = { pickerOpen: true, destinations, frozen: false, layout: { isSuccess: true, isFetching: false, isError: false },
    chooseDestination: destination => chosen.push(destination.id), closePicker() {} };
  const { PutawayLocationPicker } = load('src/features/receiving/components/receipt-workspace/putaway-location-picker.tsx', {
    react: runtime.react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Modal: 'Modal', FlatList: 'FlatList', View: 'View', Text: 'Text', StyleSheet: { create: value => value } },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' },
    '@/components/ui/alert-banner': { AlertBanner: 'AlertBanner' }, '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/text-field': { TextField: 'TextField' }, '@/constants/theme': { FontFamily: {} },
    '@/features/scanner/components/scan-code-button': { ScanCodeButton: 'ScanCodeButton' },
    '@/hooks/use-theme': { useTheme: () => ({}) }, '@/lib/api-error': { getApiErrorMessage: error => error.message },
    '../../putaway-allocation': { resolvePutawayScan: (code, metadata) => {
      assert.equal(metadata, destinations);
      if (code === 'KOVIA:LOC:RACK:rack') return { index: 1 };
      if (code === 'S0') return { index: 0 };
      throw new Error('Mã trùng ở nhiều vị trí');
    } },
  });
  const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node)
    ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const render = () => {
    const tree = nodes(runtime.render(() => PutawayLocationPicker({ state, receivingSlotId: 'staging' })));
    const list = tree.find(node => node.type === 'FlatList');
    return { list, header: nodes(list.props.ListHeaderComponent) };
  };
  assert.deepEqual(render().list.props.data.map(item => item.id), ['rack-slot']);
  let scan = render().header.find(node => node.type === 'ScanCodeButton');
  assert.equal(scan.props.onScan('KOVIA:LOC:RACK:rack'), true);
  assert.deepEqual(chosen, ['rack-slot']);
  assert.equal(render().header.find(node => node.type === 'ScanCodeButton').props.onScan('S0'), false);
  assert.ok(render().header.some(node => node.type === 'AlertBanner' && /khác vị trí nhận/.test(node.props.title)));
  scan = render().header.find(node => node.type === 'ScanCodeButton');
  assert.equal(scan.props.onScan('UNKNOWN'), false);
  assert.ok(render().header.some(node => node.type === 'AlertBanner' && /Mã trùng/.test(node.props.title)));
  state.layout.isFetching = true;
  assert.equal(render().header.find(node => node.type === 'ScanCodeButton').props.disabled, true);
});

test('off-plan reason controls appear after allocation rows and have a visible footer shortcut', () => {
  const runtime = hooks(); const jsx = (type, props) => ({ type, props });
  const { PutawayAllocationModal } = load('src/features/receiving/components/receipt-workspace/putaway-allocation-modal.tsx', {
    react: { ...runtime.react, useCallback: callback => callback }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react-native': {}, 'react-hook-form': { Controller: 'Controller' },
    'react-native': { Modal: 'Modal', FlatList: 'FlatList', View: 'View', Text: 'Text', Pressable: 'Pressable',
      KeyboardAvoidingView: 'KeyboardAvoidingView', Platform: { OS: 'android' }, StyleSheet: { create: value => value } },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' },
    '@/components/ui/alert-banner': { AlertBanner: 'AlertBanner' }, '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/text-field': { TextField: 'TextField' }, '@/constants/theme': { FontFamily: {}, Radius: {} },
    '@/hooks/use-theme': { useTheme: () => ({}) }, '@/lib/api-error': {}, '@/lib/number-format': { formatQuantity: String },
    '@/features/inventory/inventory.labels': inventoryLabels,
    '@/features/scanner/components/scan-code-button': { ScanCodeButton: 'ScanCodeButton' },
    '../../receiving.schema': { PUTAWAY_REASON_OPTIONS: [{ code: 'Other', label: 'Lý do khác' }] },
    './confirmation-modal': {}, './location-picker': {}, './putaway-allocation-item': {}, './putaway-location-picker': {},
  });
  const state = { visible: true, values: { lines: [], overrideReason: '' }, scans: {}, scanText: '', form: { control: {} },
    mutation: {}, layout: {}, allocation: { rows: [{ offPlan: true }], needsReason: true, reasonValid: false } };
  const tree = runtime.render(() => PutawayAllocationModal({ state, locations: {}, receipt: { items: [] }, suggestions: null, suggesting: false, suggestionError: null, onSuggest() {} }));
  const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node)
    ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const all = nodes(tree); const list = all.find(node => node.type === 'FlatList');
  assert.ok(list.props.ListFooterComponent);
  const controls = nodes(list.props.ListFooterComponent).filter(node => node.type === 'Controller');
  assert.deepEqual(controls.map(node => node.props.name), ['overrideReasonCode', 'overrideReason']);
  const note = controls[1].props.render({ field: { value: '', onChange() {}, onBlur() {} }, fieldState: {} });
  assert.equal(note.props.label, 'Mô tả lý do');
  assert.ok(all.some(node => node.type === 'Button' && node.props.label === 'Bổ sung lý do để tiếp tục'));
});

function handoffFixture() {
  const runtime = hooks();
  const routes = [];
  let focusedEffect;
  let lifecycle;
  let fetches = 0;
  let fail = false;
  let permission = true;
  const detail = { id: 'receipt', inboundRequestId: 'inbound', warehouseId: 'warehouse', version: 'v1', status: 'PendingApproval',
    receivingAssignedTo: 'user', putAwayAssignedTo: 'user', receivingSlotId: 'staging', arrivalStockPostedAt: 'today',
    putAwayTaskExecutionStatus: 'Queued', items: [{ remainingPutAwayQuantity: 2 }] };
  const actions = { currentVersion: 'v1', allowedActions: ['PutAway'] };
  const context = { contextKey: 'warehouse:inbound', documentId: 'inbound', receiptId: 'receipt', userId: 'user', mode: 'receiving', canView: true,
    scope: { warehouseId: 'warehouse' }, assertCurrent: () => { if (!permission) throw new Error('revoked'); },
    receipt: { data: detail, refetch: async () => { fetches++; return { isError: fail, data: detail }; } },
    actions: { refetch: async () => ({ isError: fail, data: actions }) } };
  const { useReceiptHandoff, canContinueToPutaway } = load('src/features/receiving/hooks/use-receipt-handoff.ts', {
    react: { ...runtime.react, useCallback: callback => callback },
    'expo-router': { router: { replace: route => routes.push(route) }, useFocusEffect: callback => { focusedEffect = callback; } },
    'react-native': { AppState: { currentState: 'active', addEventListener: (_, callback) => { lifecycle = callback; return { remove() {} }; } } },
    '@/config/permission-codes': { P: {} },
  });
  return { detail, actions, context, routes, canContinueToPutaway, fetches: () => fetches,
    fail: () => { fail = true; }, revoke: () => { permission = false; }, background: () => lifecycle('background'),
    foreground: () => lifecycle('active'), start: (paused = false) => { runtime.render(() => useReceiptHandoff(context, paused)); return focusedEffect(); } };
}

test('approval handoff requires current assignment, status, stock and matching allowed-action version', () => {
  const fixture = handoffFixture();
  const approved = { ...fixture.detail, status: 'Approved' };
  assert.equal(fixture.canContinueToPutaway(approved, 'user', fixture.actions), true);
  for (const change of [{ status: 'PendingApproval' }, { status: 'Completed' }, { putAwayAssignedTo: 'other' },
    { keptAtReceiving: true }, { receivingSlotId: null }, { arrivalStockPostedAt: null }, { putAwayTaskRequiresReconciliation: true },
    { putAwayTaskExecutionStatus: 'Cancelled' }, { putAwayTaskExecutionStatus: 'Completed' }, { putAwayTaskCancelledAt: 'today' },
    { items: [{ remainingPutAwayQuantity: 0 }] }])
    assert.equal(fixture.canContinueToPutaway({ ...approved, ...change }, 'user', fixture.actions), false);
  assert.equal(fixture.canContinueToPutaway(approved, 'user', { ...fixture.actions, currentVersion: 'old' }), false);
  assert.equal(fixture.canContinueToPutaway(approved, 'user', { ...fixture.actions, allowedActions: [] }), false);
});

test('waiting receipt follows approval into assigned putaway once and stops polling on blur/background', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fixture = handoffFixture();
  const stop = fixture.start();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.routes.length, 0);
  fixture.background(); t.mock.timers.tick(10000);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.fetches(), 1);
  fixture.detail.status = 'Approved';
  fixture.foreground();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(fixture.routes, [{ pathname: '/(account)/putaway/[id]', params: { id: 'receipt' } }]);
  t.mock.timers.tick(10000);
  assert.equal(fixture.routes.length, 1);
  stop();
});

test('handoff stays on receiving after wrong assignment, permission loss, stale actions or query failure', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const scenario of ['assigned-other', 'revoked', 'stale', 'error', 'foreign-scope', 'paused', 'putaway-mode']) {
    const fixture = handoffFixture(); fixture.detail.status = 'Approved';
    if (scenario === 'assigned-other') fixture.detail.putAwayAssignedTo = 'other';
    if (scenario === 'revoked') fixture.revoke();
    if (scenario === 'stale') fixture.actions.currentVersion = 'old';
    if (scenario === 'error') fixture.fail();
    if (scenario === 'foreign-scope') fixture.detail.warehouseId = 'other';
    if (scenario === 'putaway-mode') fixture.context.mode = 'putaway';
    const stop = fixture.start(scenario === 'paused');
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(fixture.routes.length, 0, scenario);
    stop?.();
    const count = fixture.fetches(); t.mock.timers.tick(10000);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(fixture.fetches(), count, `blur must stop ${scenario}`);
  }
});

test('handoff detects a later putaway assignment and ignores responses arriving after leaving the screen', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fixture = handoffFixture(); fixture.detail.status = 'Approved'; fixture.detail.putAwayAssignedTo = null;
  const stop = fixture.start();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.routes.length, 0);
  fixture.detail.putAwayAssignedTo = 'user'; t.mock.timers.tick(5000);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(fixture.routes.length, 1); stop();
  const late = handoffFixture(); late.detail.status = 'Approved';
  let resolveDetail;
  late.context.receipt.refetch = () => new Promise(resolve => { resolveDetail = resolve; });
  const blur = late.start(); blur();
  resolveDetail({ data: late.detail, isError: false });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(late.routes.length, 0);
});

test('continuous scanner stays open for consecutive locations and closes only on Done; single-row scanner still closes', async () => {
  for (const continuous of [true, false]) {
    const runtime = hooks();
    const jsx = (type, props) => ({ type, props });
    const seen = [];
    const { ScanCodeButton } = load('src/features/scanner/components/scan-code-button.tsx', {
      react: runtime.react, 'react/jsx-runtime': { jsx, jsxs: jsx },
      'react-native': { Modal: 'Modal', View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: value => value } },
      'lucide-react-native': { ScanLine: 'ScanLine' }, '@/components/ui/button': { Button: 'Button' },
      '@/constants/theme': { FontFamily: {}, Radius: {} }, '@/hooks/use-theme': { useTheme: () => ({}) },
      '../screens/scanner-screen': { ScannerScreen: 'ScannerScreen' },
    });
    const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node)
      ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
    const render = () => nodes(runtime.render(() => ScanCodeButton({ label: 'Quét mã vị trí', title: 'Quét', continuous,
      onScan: code => { seen.push(code); return true; }, confirm: { label: 'Xong', onPress() {} } })));
    render().find(node => node.type === 'Button').props.onPress();
    await render().find(node => node.type === 'ScannerScreen').props.onScan('A07');
    if (continuous) {
      const scanner = render().find(node => node.type === 'ScannerScreen');
      assert.ok(scanner);
      await scanner.props.onScan('A04');
      assert.deepEqual(seen, ['A07', 'A04']);
      render().find(node => node.type === 'ScannerScreen').props.confirm.onPress();
    }
    assert.equal(render().some(node => node.type === 'ScannerScreen'), false);
  }
});

test('continuous scanner can complete a source-product session without another Done press and never completes a rejected scan', async () => {
  const runtime = hooks(); const jsx = (type, props) => ({ type, props }); let complete = false; let closed = 0;
  const { ScanCodeButton } = load('src/features/scanner/components/scan-code-button.tsx', {
    react: runtime.react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Modal: 'Modal', View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: value => value } },
    'lucide-react-native': { ScanLine: 'ScanLine' }, '@/components/ui/button': { Button: 'Button' },
    '@/constants/theme': { FontFamily: {}, Radius: {} }, '@/hooks/use-theme': { useTheme: () => ({}) },
    '../screens/scanner-screen': { ScannerScreen: 'ScannerScreen' },
  });
  const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const render = () => nodes(runtime.render(() => ScanCodeButton({ label: 'Quét', title: 'Quét', continuous: true, showScannedCode: false,
    closeAfterScan: () => complete, onBeforeClose: () => { closed++; return true; },
    onScan: code => { if (code === 'product') complete = true; return code !== 'wrong'; } })));
  render().find(node => node.type === 'Button').props.onPress();
  const scanner = render().find(node => node.type === 'ScannerScreen'); assert.equal(scanner.props.showScannedCode, false);
  complete = true;
  await scanner.props.onScan('wrong'); assert.equal(closed, 0); assert.ok(render().find(node => node.type === 'ScannerScreen'));
  complete = false;
  await scanner.props.onScan('source'); assert.equal(closed, 0); assert.ok(render().find(node => node.type === 'ScannerScreen'));
  // The completion predicate reads current state even if React has not supplied a new callback yet.
  await scanner.props.onScan('product'); assert.equal(closed, 1); assert.equal(render().some(node => node.type === 'ScannerScreen'), false);
});

test('scan feedback can hide barcode text and its screen-reader label without losing the verdict', () => {
  const jsx = (type, props) => ({ type, props });
  const { ScanStatus } = load('src/features/scanner/components/scan-status.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Text: 'Text', ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: value => value } },
    'lucide-react-native': { AlertCircle: 'AlertCircle', CheckCircle2: 'CheckCircle2', ScanLine: 'ScanLine' },
    '@/constants/theme': { FontFamily: {} }, '@/hooks/use-theme': { useTheme: () => ({}) }, '../scanner.types': {},
  });
  const props = { isProcessing: false, lastScan: { code: '4449020288887', isValid: true } };
  assert.equal(JSON.stringify(ScanStatus({ ...props, showCode: false })).includes(props.lastScan.code), false);
  assert.equal(JSON.stringify(ScanStatus(props)).includes(props.lastScan.code), true);
});

function putawayFixture(responses) {
  const runtime = hooks();
  let values = { lines: [], overrideReason: '' };
  let draftMarks = 0;
  let rejectedMarks = 0;
  let commands = 0;
  let requests = [];
  let allowed = true;
  let receiptVersion = 'v1';
  const form = { control: {}, formState: { isDirty: false }, getValues: key => key ? values[key] : values,
    reset: next => { values = next ?? { lines: [], overrideReason: '' }; }, handleSubmit: callback => () => callback(values), setValue() {} };
  const receipt = { id: 'receipt', version: 'v1', items: [] };
  const context = { contextKey: 'warehouse:receipt', receiptId: receipt.id, documentId: receipt.id, scope: { warehouseId: 'warehouse' },
    prefix: ['warehouse'], receipt: { data: receipt }, permission: () => true, allowed: () => allowed,
    assertCurrent() {}, assertAction: () => { if (!allowed || receiptVersion !== 'v1') throw new Error('stale'); }, refreshWarehouse: async () => {} };
  const mutation = { reset() {}, isPending: false };
  const { usePutawayAllocation } = load('src/features/receiving/hooks/use-putaway-allocation.ts', {
    react: runtime.react, '@hookform/resolvers/zod': { zodResolver() {} },
    '@tanstack/react-query': { useQuery: () => ({}), useMutation: options => {
      mutation.mutateAsync = async body => { const result = await options.mutationFn(body); await options.onSuccess?.(result, body); return result; }; return mutation;
    } },
    'react-hook-form': { useForm: () => form, useFieldArray: () => ({ fields: [] }), useWatch: () => values },
    '@/hooks/use-form-draft': { useFormDraft: () => ({ beforeSubmit: async () => { draftMarks++; },
      afterRejectedSubmit: async () => { rejectedMarks++; }, clear: async () => {} }) },
    '@/config/permission-codes': { P: {} }, '@/lib/api-error': { logApiError() {}, isApiErrorResponse: value => typeof value?.statusCode === 'number', getApiErrorCode: value => value.errors?.code?.[0] },
    '@/features/inventory/inventory.labels': inventoryLabels, '../receiving.schema': {},
    '../receiving': { receiptCommand: () => ({ commandId: `command-${++commands}` }) },
    '../putaway-allocation': {
      layoutDestinations: () => [], putawayAllocationState: () => ({}), assertPutawayAllocation: () => ({ needsReason: false }),
      putawayScanKey: line => `${line.goodsReceiptItemId}:${line.destination?.id}`,
      buildPutawayAllocations: () => ({ lines: [{ goodsReceiptItemId: 'line', destination: { id: 'slot' }, enteredUnitId: 'unit', enteredQuantity: 2 }], overrideReason: '' }),
    },
    '../receiving.api': { receivingApi: { putAway: async (id, body, guard) => {
      guard(); requests.push([id, structuredClone(body)]);
      if (responses[requests.length - 1]) throw responses[requests.length - 1];
    } } },
  });
  const render = () => runtime.render(() => usePutawayAllocation(context, { close() {} }));
  return { render, values: () => values, requests, marks: () => ({ draftMarks, rejectedMarks }), stale: () => { allowed = false; receiptVersion = 'v2'; } };
}

test('batch putaway retries an uncertain response with the same rows and command after actions change', async () => {
  const fixture = putawayFixture([new Error('timeout after server commit')]);
  fixture.render().begin(); await fixture.render().prepare(); await fixture.render().confirm();
  assert.equal(fixture.render().frozen, true);
  fixture.values().lines[0].enteredQuantity = 99;
  fixture.stale();
  await fixture.render().confirm();
  assert.equal(fixture.requests.length, 2);
  assert.deepEqual(fixture.requests[0], fixture.requests[1]);
  assert.equal(fixture.requests[1][1].lines[0].enteredQuantity, 2);
  assert.deepEqual(fixture.marks(), { draftMarks: 1, rejectedMarks: 0 });
  assert.equal(fixture.render().visible, false);
});

test('authoritative first barcode rejection unlocks editing and creates a new command for the correction', async () => {
  const error = Object.assign(new Error('Mã không khớp'), { statusCode: 400, errors: { code: ['PUTAWAY_SLOT_CODE_MISMATCH'] } });
  const fixture = putawayFixture([error]);
  fixture.render().begin(); await fixture.render().prepare(); await fixture.render().confirm();
  assert.equal(fixture.render().frozen, false);
  assert.equal(fixture.render().review, null);
  assert.equal(fixture.marks().rejectedMarks, 1);
  fixture.values().lines[0].enteredQuantity = 3;
  await fixture.render().prepare(); await fixture.render().confirm();
  assert.notEqual(fixture.requests[0][1].commandId, fixture.requests[1][1].commandId);
  assert.equal(fixture.requests[1][1].lines[0].enteredQuantity, 3);
});

test('a rejection received after an uncertain send cannot unlock or replace the original request', async () => {
  const fixture = putawayFixture([new Error('lost response'), Object.assign(new Error('bad replay'), { statusCode: 400 })]);
  fixture.render().begin(); await fixture.render().prepare(); await fixture.render().confirm();
  await fixture.render().confirm();
  assert.equal(fixture.render().frozen, true);
  assert.deepEqual(fixture.requests[0], fixture.requests[1]);
  assert.equal(fixture.marks().rejectedMarks, 0);
});

test('a definitively rejected draft resumes safe autosave without preserving a pending-send marker', async () => {
  const runtime = hooks();
  const writes = [];
  let change;
  let background;
  let values = { lines: [{ enteredQuantity: 2 }] };
  const selection = Object.assign(() => ({ identity: 'user', warehouseId: 'warehouse' }), { getState: () => ({ identity: 'user', warehouseId: 'warehouse' }) });
  const { useFormDraft } = load('src/hooks/use-form-draft.ts', {
    react: { ...runtime.react, useLayoutEffect: effect => effect() },
    'react-native': { Alert: { alert() {} }, AppState: { addEventListener: (_, callback) => { background = callback; return { remove() {} }; } } },
    'sonner-native': { toast: { error: message => { throw new Error(message); } } },
    '@/features/auth/auth.store': { useAuth: { getState: () => ({ signedIn: true }) } },
    '@/features/warehouse-access/warehouse-access.store': { useWarehouseSelection: selection },
    '@/lib/api': { API_BASE_URL: 'http://fixture.local' }, '@/lib/api-error': { getApiErrorMessage: error => error.message },
    '@/lib/form-draft-storage': { formDraftStorage: { read: async () => null, pending: async () => [],
      write: async (value, guard) => { guard(); writes.push(structuredClone(value)); }, remove: async () => {} } },
  });
  const draft = runtime.render(() => useFormDraft({ feature: 'putaway-allocation', documentId: 'receipt', version: 'v1', enabled: true, assertCurrent() {},
    form: { getValues: () => values, watch: callback => { change = callback; return { unsubscribe() {} }; } } }));
  await new Promise(resolve => setImmediate(resolve));
  await draft.beforeSubmit();
  assert.equal(writes.at(-1).pending, true);
  await draft.afterRejectedSubmit();
  assert.equal(writes.at(-1).pending, false);
  values = { lines: [{ enteredQuantity: 3 }] }; change(); background('inactive');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(writes.at(-1).pending, false);
  assert.equal(writes.at(-1).values.lines[0].enteredQuantity, 3);
});

test('putaway suggestions show rack locations without the internal default-slot code', () => {
  const jsx = (type, props) => ({ type, props });
  const { PutAwaySuggestionsModal } = load('src/features/receiving/components/receipt-workspace/putaway-suggestions-modal.tsx', {
    react: { useCallback: callback => callback }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { FlatList: 'FlatList', Modal: 'Modal', Text: 'Text', View: 'View', StyleSheet: { create: value => value } },
    'react-native-safe-area-context': { SafeAreaProvider: 'SafeAreaProvider', SafeAreaView: 'SafeAreaView' },
    '@/components/ui/alert-banner': { AlertBanner: 'AlertBanner' }, '@/components/ui/button': { Button: 'Button' },
    '@/constants/theme': { FontFamily: {}, Radius: {} }, '@/hooks/use-theme': { useTheme: () => ({}) },
    '@/lib/api-error': {}, '@/features/inventory/inventory.labels': inventoryLabels,
  });
  const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node)
    ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const selected = [];
  for (const slotCode of ['__SYSTEM_DEFAULT__', 'S01']) {
    const slot = { slotId: 'destination', slotCode, zoneName: 'Hàng khô', rackCode: 'K01', warnings: [] };
    const tree = PutAwaySuggestionsModal({ visible: true, busy: false, error: null, onClose() {}, onChoose: id => selected.push(id),
      data: { items: [{ goodsReceiptItemId: 'line', suggestions: [slot] }], risks: [], heldSlots: [] } });
    const list = nodes(tree).find(node => node.type === 'FlatList');
    const row = nodes(list.props.renderItem({ item: list.props.data[0] }));
    const text = row.filter(node => node.type === 'Text').flatMap(node => node.props.children).join('');
    assert.equal(text.includes('__SYSTEM_DEFAULT__'), false);
    assert.ok(text.includes('Hàng khô · Kệ K01'));
    if (slotCode === 'S01') assert.ok(text.includes('S01'));
    const button = row.find(node => node.type === 'Button');
    assert.equal(button.props.label.includes('__SYSTEM_DEFAULT__'), false);
    button.props.onPress();
  }
  assert.deepEqual(selected, ['destination', 'destination']);
});

test('submit keeps the receipt selected before the completed receiving task disappears on refresh', async () => {
  const runtime = hooks();
  const events = [];
  const mutations = [];
  const context = {
    contextKey: 'warehouse:inbound', documentId: 'inbound', receiptId: 'receipt',
    permission: () => true,
    rememberReceipt: id => { context.receiptId = id; events.push(['remember', id]); },
    refreshWarehouse: async () => { events.push(['refresh', context.receiptId]); },
  };
  const { useReceiptExecution } = load('src/features/receiving/hooks/use-receipt-execution.ts', {
    react: runtime.react,
    '@hookform/resolvers/zod': { zodResolver: () => undefined },
    '@tanstack/react-query': { useMutation: options => { mutations.push(options); return {}; } },
    'react-hook-form': { useForm: () => ({ reset() {} }) },
    '@/hooks/use-form-draft': { useFormDraft: () => ({ beforeSubmit: async () => {}, clear: async () => events.push(['clear']) }) },
    '@/config/permission-codes': { P: {} }, '@/lib/api-error': { logApiError() {} },
    '../receiving': {}, '../receiving.api': {}, '../receiving.schema': {},
  });
  const render = () => runtime.render(() => useReceiptExecution(context, null, {}, {}));
  render();
  const success = mutations[0].onSuccess;
  await success(undefined, { key: context.contextKey, receiptId: 'submitted-receipt', action: 'Submit' });
  assert.deepEqual(events, [['remember', 'submitted-receipt'], ['clear'], ['refresh', 'submitted-receipt']]);
  assert.match(render().notice, /Đã gửi duyệt/);
  events.length = 0;
  await success(undefined, { key: 'other-warehouse', receiptId: 'foreign', action: 'Submit' });
  assert.deepEqual(events, []);
  await success(undefined, { key: context.contextKey, receiptId: 'putaway-receipt', action: 'PutAway' });
  assert.deepEqual(events, [['clear'], ['refresh', 'submitted-receipt']]);
});

function editorFixture(receipt = null, apiOverrides = {}) {
  const runtime = hooks();
  const suggestion = { data: undefined, isFetching: false, isError: false };
  let values = { receiptCode: '', lines: [] };
  let queryOptions;
  const calls = [];
  const mutation = { reset() { this.error = null; this.variables = undefined; }, isPending: false };
  const form = {
    control: {}, formState: { isDirty: false, isSubmitted: false },
    getValues: key => key ? values[key] : values,
    setValue: (key, value) => { values[key] = value; },
    reset: next => { values = next ?? { receiptCode: '', lines: [] }; },
    handleSubmit: callback => () => callback(values),
  };
  const context = {
    contextKey: 'user:warehouse:document', prefix: ['warehouse', 'user', 'warehouse', 1],
    documentId: 'document', userId: 'user', receiptId: receipt?.id ?? null,
    task: { data: { version: 'v1', lines: [], assignedTo: 'user' } }, receipt: { data: receipt },
    scope: { warehouseId: 'warehouse' }, assertCurrent() {}, assertAction() {},
    rememberReceipt: id => calls.push(['remember', id]), refreshWarehouse: async () => {},
    permission: () => true, allowed: () => true,
  };
  const { useReceiptEditor } = load('src/features/receiving/hooks/use-receipt-editor.ts', {
    react: runtime.react,
    '@hookform/resolvers/zod': { zodResolver: () => undefined },
    '@tanstack/react-query': {
      useQuery: options => { queryOptions = options; return suggestion; },
      useMutation: options => {
        mutation.mutateAsync = async variables => {
          mutation.variables = variables;
          try { const result = await options.mutationFn(variables); await options.onSuccess?.(result); return result; }
          catch (error) { mutation.error = error; options.onError?.(error); throw error; }
        };
        return mutation;
      },
    },
    'react-hook-form': { useForm: () => form, useFieldArray: () => ({}) },
    '@/hooks/use-form-draft': { useFormDraft: () => ({ beforeSubmit: async () => {}, recordResult: async () => {}, clear: async () => {}, afterRejectedSubmit: async () => {} }) },
    '@/config/permission-codes': { P: { GOODS_RECEIPTS_CREATE: 'goods-receipts:create', GOODS_RECEIPTS_SUBMIT: 'goods-receipts:submit' } },
    '@/lib/api': { ApiError: class extends Error {} },
    '@/lib/api-error': { logApiError() {}, isApiErrorResponse: value => typeof value?.statusCode === 'number' && typeof value?.message === 'string' },
    '../receiving': { receiptToForm: value => ({ receiptCode: value.receiptCode, lines: [] }),
      assertReceiptQuantities() {}, assertReceiptCorrection() {},
      receiptCommand: (previous, body) => previous?.hash === JSON.stringify(body) ? previous : { hash: JSON.stringify(body), commandId: require('node:crypto').randomUUID() } },
    '../receiving.api': { receivingApi: {
      create: async body => { calls.push(['create', body]); return 'saved-receipt'; },
      update: async (...args) => calls.push(['update', ...args]),
      receipt: async () => ({ version: 'saved-version' }),
      actions: async () => ({ currentVersion: 'saved-version', allowedActions: ['Submit'] }),
      submit: async (...args) => { calls.push(['submit', ...args]); }, ...apiOverrides,
    } },
    '../receiving.schema': {},
  });
  return { form, suggestion, context, calls, mutation, options: () => queryOptions,
    render: () => runtime.render(() => useReceiptEditor(context)) };
}

test('delivery and refusal photos survive draft creation/version refresh but reset for next batch and warehouse', async () => {
  const runtime = hooks();
  const selection = { identity: 'user', warehouseId: 'warehouse', revision: 1, signature: 'scope' };
  const task = { data: { assignedTo: 'user', version: 'v1', activeGoodsReceiptId: null } };
  const receipt = { data: null };
  const access = { ready: true, selection, profile: { data: { id: 'user', permissions: ['view'] } } };
  const { useReceiptContext } = load('src/features/receiving/hooks/use-receipt-context.ts', {
    react: { ...runtime.react, useCallback: callback => callback },
    'expo-router/react-navigation': { useIsFocused: () => true },
    '@/features/notifications/hooks/use-notification-realtime': { useNotificationRealtime() {} },
    '@/features/notifications/notifications.schema': {},
    '@tanstack/react-query': { useQueryClient: () => ({}), useQuery: options => options.queryKey.includes('task') ? task : receipt },
    '@/config/permission-codes': { P: { GOODS_RECEIPTS_VIEW: 'view' } },
    '@/features/auth/auth.store': {}, '@/features/my-tasks/my-tasks': {},
    '@/features/warehouse-access/hooks/use-warehouse-access': { useWarehouseAccess: () => access },
    '@/features/warehouse-access/warehouse-access': {}, '@/features/warehouse-access/warehouse-access.store': {},
    '@/lib/dotnet-guid.schema': { nonEmptyDotNetGuidSchema: () => ({ safeParse: () => ({ success: true }) }) },
    '../receiving': {}, '../receiving.api': {},
  });
  let uploads = 0;
  const overrides = {
    react: runtime.react,
    'expo-image-picker': { launchImageLibraryAsync: async () => ({ canceled: false,
      assets: [{ mimeType: 'image/jpeg', fileSize: 100, uri: 'photo.jpg', fileName: 'photo.jpg' }] }) },
    '@/config/permission-codes': { P: {} }, '@/lib/api-error': { getApiErrorMessage: error => error.message },
    '../receiving.api': { receivingApi: { uploadEvidence: async () => ({ id: `photo-${++uploads}`, fileName: 'photo.jpg' }) } },
  };
  const { useDocumentEvidence } = load('src/features/receiving/hooks/use-document-evidence.ts', overrides);
  const { useRefusalEvidence } = load('src/features/receiving/hooks/use-refusal-evidence.ts', overrides);
  const render = () => runtime.render(() => {
    const context = useReceiptContext('receiving', 'inbound');
    const evidenceContext = { ...context, assertCurrent() {}, assertAction() {} };
    return { context, document: useDocumentEvidence(evidenceContext), refusal: useRefusalEvidence(evidenceContext) };
  });
  await render().document.addPhoto('library');
  await render().refusal.addPhoto();
  render().refusal.toggle();
  const evidenceKey = render().context.evidenceKey;
  render().context.rememberReceipt('saved-receipt');
  task.data.activeGoodsReceiptId = 'saved-receipt';
  receipt.data = { id: 'saved-receipt', warehouseId: 'warehouse', version: 'v2' };
  assert.equal(render().context.receiptId, 'saved-receipt');
  assert.equal(render().context.evidenceKey, evidenceKey);
  assert.equal(render().document.files.length, 1);
  assert.equal(render().refusal.files.length, 1);
  assert.equal(render().refusal.acknowledged, true);
  receipt.data.version = 'v3';
  assert.equal(render().document.files.length, 1);
  render().context.rememberReceipt(null);
  assert.equal(render().document.files.length, 0);
  assert.equal(render().refusal.files.length, 0);
  assert.equal(render().refusal.acknowledged, false);
  receipt.data = null;
  await render().document.addPhoto('library');
  assert.equal(render().document.files.length, 1);
  selection.warehouseId = 'other-warehouse'; selection.revision++;
  assert.equal(render().document.files.length, 0);
  assert.equal(render().refusal.files.length, 0);
  assert.equal(uploads, 3);
});

test('save and submit creates once, reads the saved version and sends evidence in one editor session', async () => {
  const fixture = editorFixture();
  fixture.render().begin();
  fixture.form.reset({ receiptCode: 'PN000010', lines: [{ receivedQty: 2, rejectedQty: 1 }] });
  await fixture.render().save({ receivingSlotId: 'staging', refusedGoodsHandedBack: true,
    refusalEvidenceIds: ['refusal'], documentEvidenceIds: ['delivery'] });
  assert.equal(fixture.calls.filter(call => call[0] === 'create').length, 1);
  const submit = fixture.calls.find(call => call[0] === 'submit');
  assert.equal(submit[1], 'saved-receipt');
  assert.equal(submit[2].expectedVersion, 'saved-version');
  assert.deepEqual(submit[2].documentEvidenceIds, ['delivery']);
  assert.deepEqual(fixture.calls.at(-1), ['remember', 'saved-receipt']);
  assert.equal(fixture.render().target, null);
});

test('uncertain submit retry uses exactly the same command and never creates a second receipt', async () => {
  const attempts = [];
  const fixture = editorFixture(null, { submit: async (...args) => {
    attempts.push(args); if (attempts.length === 1) throw new Error('Network response lost');
  } });
  fixture.render().begin();
  fixture.form.reset({ receiptCode: 'PN000010', lines: [{ receivedQty: 2, rejectedQty: 0 }] });
  await fixture.render().save({ receivingSlotId: 'staging', documentEvidenceIds: ['delivery'] });
  assert.equal(fixture.render().frozen, true);
  assert.match(fixture.render().savedNotice, /Phiếu đã lưu/);
  await fixture.render().save({ receivingSlotId: 'changed' });
  assert.equal(fixture.calls.filter(call => call[0] === 'create').length, 1);
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[1][1], attempts[0][1]);
});

test('authoritative create/update validation failure preserves entered values and allows corrected submission', async () => {
  for (const phase of ['create', 'update']) for (const statusCode of [400, 422]) {
    const attempts = [];
    const fixture = editorFixture(phase === 'update' ? { id: 'receipt', version: 'v1', receiptCode: 'PN-INVALID' } : null, { [phase]: async (...args) => {
      const body = args[phase === 'create' ? 0 : 1];
      attempts.push(body);
      if (attempts.length === 1) throw Object.assign(new Error('Invalid lot'), { statusCode });
      return 'saved-receipt';
    } });
    fixture.render().begin();
    fixture.form.reset({ receiptCode: 'PN-INVALID', lines: [{ receivedQty: 2, rejectedQty: 0, lotNumber: 'old' }] });
    await fixture.render().save();
    assert.equal(fixture.render().frozen, false);
    assert.equal(fixture.form.getValues('receiptCode'), 'PN-INVALID');
    fixture.form.reset({ receiptCode: 'PN-CORRECTED', lines: [{ receivedQty: 2, rejectedQty: 0, lotNumber: 'new' }] });
    await fixture.render().save();
    assert.equal(attempts.length, 2);
    assert.equal(attempts[1].receiptCode, 'PN-CORRECTED');
    assert.equal(attempts[1].lines[0].lotNumber, 'new');
    assert.notEqual(attempts[1].commandId, attempts[0].commandId);
  }
});

test('submit validation rejection rebinds editing to saved receipt and corrects by update, without creating twice', async () => {
  const attempts = [];
  const fixture = editorFixture(null, { submit: async (...args) => {
    attempts.push(args);
    if (attempts.length === 1) throw Object.assign(new Error('Invalid staging'), { statusCode: 400 });
  } });
  fixture.render().begin();
  fixture.form.reset({ receiptCode: 'PN-001', lines: [{ receivedQty: 2, rejectedQty: 0 }] });
  await fixture.render().save({ receivingSlotId: 'wrong' });
  assert.equal(fixture.render().frozen, false);
  assert.equal(fixture.render().target.receiptId, 'saved-receipt');
  assert.equal(fixture.render().target.version, 'saved-version');
  assert.equal(fixture.form.getValues('receiptCode'), 'PN-001');
  fixture.form.reset({ receiptCode: 'PN-001', lines: [{ receivedQty: 1, rejectedQty: 0 }] });
  await fixture.render().save({ receivingSlotId: 'correct', documentEvidenceIds: ['photo'] });
  assert.equal(fixture.calls.filter(call => call[0] === 'create').length, 1);
  const update = fixture.calls.find(call => call[0] === 'update');
  assert.equal(update[1], 'saved-receipt');
  assert.equal(update[2].expectedVersion, 'saved-version');
  assert.equal(update[2].lines[0].receivedQty, 1);
  assert.equal(attempts[1][1].receivingSlotId, 'correct');
  assert.deepEqual(attempts[1][1].documentEvidenceIds, ['photo']);
});

test('validation response after an uncertain create or submit keeps original command frozen for reconciliation', async () => {
  for (const phase of ['create', 'submit']) {
    const attempts = [];
    const fixture = editorFixture(null, { [phase]: async (...args) => {
      attempts.push(args);
      throw attempts.length === 1 ? new Error('Lost response') : Object.assign(new Error('Rejected replay'), { statusCode: 400 });
    } });
    fixture.render().begin();
    fixture.form.reset({ receiptCode: 'PN-001', lines: [{ receivedQty: 2, rejectedQty: 0 }] });
    await fixture.render().save({ receivingSlotId: 'original' });
    await fixture.render().save({ receivingSlotId: 'changed' });
    assert.equal(fixture.render().frozen, true, phase);
    assert.deepEqual(attempts[1][phase === 'create' ? 0 : 1], attempts[0][phase === 'create' ? 0 : 1]);
  }
});

test('submit preflight blocks missing staging, handback evidence and revoked permission before creation', async () => {
  for (const scenario of ['location', 'refusal', 'permission']) {
    const fixture = editorFixture();
    fixture.render().begin();
    fixture.form.reset({ receiptCode: 'PN000010', lines: [{ receivedQty: 2, rejectedQty: scenario === 'refusal' ? 1 : 0 }] });
    if (scenario === 'permission') fixture.context.assertCurrent = permission => {
      if (permission === 'goods-receipts:submit') throw new Error('Revoked');
    };
    await fixture.render().save({ receivingSlotId: scenario === 'location' ? null : 'staging' });
    assert.equal(fixture.calls.filter(call => call[0] === 'create').length, 0);
    assert.equal(fixture.render().frozen, false);
  }
});

test('draft-only save does not submit and closing after partial save opens the saved receipt', async () => {
  const draft = editorFixture();
  draft.render().begin();
  await draft.render().save();
  assert.equal(draft.calls.some(call => call[0] === 'submit'), false);
  const fixture = editorFixture(null, { actions: async () => { throw new Error('Read failed'); } });
  fixture.render().begin();
  await fixture.render().save({ receivingSlotId: null });
  fixture.render().close();
  assert.deepEqual(fixture.calls.at(-1), ['remember', 'saved-receipt']);
  assert.equal(fixture.render().target, null);
});

test('new receipt fetches a scoped suggestion and fills the empty code only once', () => {
  const fixture = editorFixture();
  assert.equal(fixture.options(), undefined);
  fixture.render().begin();
  fixture.render();
  assert.equal(fixture.options().enabled, true);
  assert.deepEqual(fixture.options().queryKey.slice(0, 4), fixture.context.prefix);
  fixture.suggestion.data = 'PN000010';
  fixture.render();
  assert.equal(fixture.form.getValues('receiptCode'), 'PN000010');
  fixture.suggestion.data = 'PN000011';
  fixture.render();
  assert.equal(fixture.form.getValues('receiptCode'), 'PN000010');
});

test('late code suggestion preserves manual edits, including a deliberately cleared field', () => {
  for (const code of ['CUSTOM-009', '']) {
    const fixture = editorFixture();
    fixture.render().begin();
    fixture.render().markCodeEdited();
    fixture.form.setValue('receiptCode', code);
    fixture.suggestion.data = 'PN000010';
    fixture.render();
    assert.equal(fixture.form.getValues('receiptCode'), code);
  }
});

test('restored draft code wins whether restoration happens before or after the suggestion', () => {
  for (const restoreFirst of [true, false]) {
    const fixture = editorFixture();
    fixture.render().begin();
    fixture.render();
    if (restoreFirst) fixture.form.reset({ receiptCode: 'DRAFT-007', lines: [] });
    fixture.suggestion.data = 'PN000010';
    fixture.render();
    if (!restoreFirst) fixture.form.reset({ receiptCode: 'DRAFT-007', lines: [] });
    fixture.render();
    assert.equal(fixture.form.getValues('receiptCode'), 'DRAFT-007');
  }
});

test('closing or changing warehouse blocks late suggestions; reopening gets a fresh session', () => {
  const fixture = editorFixture();
  fixture.render().begin();
  let state = fixture.render();
  const firstKey = fixture.options().queryKey;
  state.close();
  fixture.suggestion.data = 'OLD-001';
  fixture.render();
  assert.equal(fixture.form.getValues('receiptCode'), '');
  fixture.render().begin();
  fixture.suggestion.isFetching = true;
  fixture.render();
  assert.notDeepEqual(fixture.options().queryKey, firstKey);
  fixture.context.contextKey = 'other-warehouse';
  fixture.suggestion.isFetching = false;
  fixture.render();
  assert.equal(fixture.options().enabled, false);
  assert.equal(fixture.form.getValues('receiptCode'), '');
});

test('editing an existing receipt never requests or replaces its code', () => {
  const fixture = editorFixture({ id: 'receipt', version: 'v1', receiptCode: 'EXISTING-001' });
  fixture.render().begin();
  fixture.suggestion.data = 'PN000010';
  fixture.render();
  assert.equal(fixture.options().enabled, false);
  assert.equal(fixture.form.getValues('receiptCode'), 'EXISTING-001');
});

test('receipt line collapses and reopens without removing or resetting entered values', () => {
  const runtime = hooks();
  const jsx = (type, props) => ({ type, props });
  const { ReceiptLineFields } = load('src/features/receiving/components/receipt-workspace/receipt-line-fields.tsx', {
    react: runtime.react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-hook-form': { Controller: 'Controller', useWatch: ({ name }) => name.endsWith('receivedQty') ? 5 : 'unit' },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: value => value } },
    '@/components/ui/button': { Button: 'Button' }, '@/components/ui/text-field': { TextField: 'TextField' },
    '@/constants/theme': { FontFamily: {}, Radius: {} },
    '@/features/scanner/components/scan-code-button': { ScanCodeButton: 'ScanCodeButton' },
    '@/hooks/use-theme': { useTheme: () => ({}) },
  });
  const values = { lines: [{ receivedQty: 5, rejectedQty: 2, lotNumber: 'LOT-01' }] };
  const props = { form: { control: {}, getValues: () => values }, index: 0, correction: false, legacy: false, busy: false,
    item: { productSKU: 'SP01', productName: 'Sản phẩm', baseUnitId: 'unit', enteredUnitId: 'unit',
      baseUnitName: 'Thùng', enteredUnitName: 'Thùng', remainingQuantity: 2, isLotTracked: true },
    onRemove: () => assert.fail('Collapsing must not remove the line') };
  const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node)
    ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const render = () => nodes(runtime.render(() => ReceiptLineFields(props)));
  let tree = render();
  const remaining = tree.find(node => node.type === 'Text' && Array.isArray(node.props.children) && node.props.children[0] === 'Còn được nhận: ');
  assert.equal(remaining.props.children[1], '2\u00a0Thùng');
  const received = tree.find(node => node.type === 'Controller' && node.props.name === 'lines.0.receivedQty');
  const receivedInput = received.props.render({ field: { value: 5 }, fieldState: {} });
  assert.equal(receivedInput.props.label, 'Số lượng thực nhận (Thùng)');
  assert.equal(receivedInput.props.hideLabel, true);
  assert.ok(tree.some(node => node.type === 'Controller'));
  tree.find(node => node.type === 'Pressable' && node.props.accessibilityState?.expanded).props.onPress();
  tree = render();
  assert.equal(tree.some(node => node.type === 'Controller'), false);
  tree.find(node => node.type === 'Pressable').props.onPress();
  tree = render();
  assert.ok(tree.some(node => node.type === 'Controller'));
  assert.deepEqual(values.lines[0], { receivedQty: 5, rejectedQty: 2, lotNumber: 'LOT-01' });
});

function locationFixture() {
  const runtime = hooks();
  const location = { id: 'receiving', slotCode: 'CHO-01', displayPath: 'Khu chờ cất hàng', isSuggested: true };
  const query = { isSuccess: true, isFetching: false, data: { items: [location], totalCount: 1 } };
  const context = { contextKey: 'warehouse:receipt', receiptId: 'receipt', mode: 'receiving', canView: true,
    prefix: ['warehouse', 'warehouse'], receipt: { data: { arrivalConfirmedAt: null } } };
  let options;
  let searchTerm = '';
  const { useReceivingLocations } = load('src/features/receiving/hooks/use-receiving-locations.ts', {
    react: runtime.react, '@hookform/resolvers/zod': { zodResolver: () => undefined },
    '@tanstack/react-query': { useQuery: value => { options = value; return query; } },
    'react-hook-form': { useForm: () => ({ reset() {}, handleSubmit: callback => () => callback({ searchTerm }) }) },
    '../receiving.api': {}, '../receiving.schema': {},
    '@/features/inventory/inventory.labels': inventoryLabels,
  });
  return { query, context, location, options: () => options, search: value => { searchTerm = value; },
    render: () => runtime.render(() => useReceivingLocations(context)) };
}

test('receiving point loads before opening the picker and only uses the backend suggestion', () => {
  const fixture = locationFixture();
  assert.equal(fixture.render().selected.id, 'receiving');
  assert.equal(fixture.options().enabled, true);
  fixture.query.data.items = [{ ...fixture.location, isSuggested: false }];
  assert.equal(fixture.render().selected, null);
  fixture.query.data.items = [fixture.location];
  fixture.query.isFetching = true;
  assert.equal(fixture.render().selected, null);
  fixture.query.isFetching = false;
  fixture.query.isSuccess = false;
  assert.equal(fixture.render().selected, null);
});

test('choosing a rack suggestion keeps the slot identity but formats the selected location', () => {
  const fixture = locationFixture();
  fixture.context.allowed = () => true;
  fixture.context.receipt.data.version = 'v1';
  fixture.render().chooseSuggested({ key: fixture.context.contextKey, version: 'v1', data: { items: [{ suggestions: [
    { slotId: 'rack-slot', slotCode: '__SYSTEM_DEFAULT__', rackCode: 'K01', zoneName: 'Hàng khô' },
  ] }] } }, 'rack-slot');
  assert.equal(fixture.render().selected.id, 'rack-slot');
  assert.equal(fixture.render().selected.slotCode, '__SYSTEM_DEFAULT__');
  assert.equal(fixture.render().selected.displayPath, 'Hàng khô · Kệ K01');
});

test('manual receiving choice survives refresh, search and pagination without being replaced by defaults', () => {
  const fixture = locationFixture();
  const manual = { id: 'manual', slotCode: 'CHO-02', displayPath: 'Điểm nhận khác' };
  fixture.query.data.items.push(manual);
  fixture.render().choose(manual);
  fixture.query.data.items = [fixture.location];
  assert.equal(fixture.render().selected.id, 'manual');
  fixture.search('CHO'); fixture.render().search();
  fixture.render().changePage(2);
  assert.equal(fixture.render().selected.id, 'manual');
  fixture.context.contextKey = 'other-warehouse';
  fixture.query.data.items = [];
  assert.equal(fixture.render().selected, null);
});

test('receiving defaults never preselect storage or isolation destinations, or confirmed receipts', () => {
  const fixture = locationFixture();
  fixture.context.mode = 'putaway';
  assert.equal(fixture.render().selected, null);
  assert.equal(fixture.options().enabled, false);
  fixture.context.mode = 'receiving';
  fixture.render().openIsolation();
  assert.equal(fixture.render().selected, null);
  assert.equal(fixture.options().queryKey.at(-2), true);
  fixture.render().open();
  fixture.context.receipt.data.arrivalConfirmedAt = '2026-10-28';
  assert.equal(fixture.render().selected, null);
});

test('separate field labels preserve input accessibility and leave other fields unchanged', () => {
  const runtime = hooks();
  const jsx = (type, props) => ({ type, props });
  const { TextField } = load('src/components/ui/text-field.tsx', {
    react: runtime.react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react-native': { Eye: 'Eye', EyeOff: 'EyeOff' },
    'react-native': { View: 'View', Text: 'Text', TextInput: 'TextInput', StyleSheet: { create: value => value } },
    '@/constants/theme': { FontFamily: {}, Radius: {} }, '@/hooks/use-theme': { useTheme: () => ({}) },
  });
  const nodes = node => !node || typeof node !== 'object' ? [] : Array.isArray(node)
    ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
  const visible = nodes(runtime.render(() => TextField({ label: 'Số lượng thực nhận' })));
  assert.ok(visible.some(node => node.type === 'Text' && node.props.children === 'Số lượng thực nhận'));
  const hidden = nodes(runtime.render(() => TextField({ label: 'Số lượng thực nhận', hideLabel: true })));
  assert.equal(hidden.some(node => node.type === 'Text'), false);
  assert.equal(hidden.find(node => node.type === 'TextInput').props.accessibilityLabel, 'Số lượng thực nhận');
  assert.equal('hideLabel' in hidden.find(node => node.type === 'TextInput').props, false);
});

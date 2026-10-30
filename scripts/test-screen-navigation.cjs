const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function load(relative, overrides = {}) {
  const filename = path.resolve(root, relative);
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(
    name => Object.hasOwn(overrides, name) ? overrides[name] : require(name), module, module.exports,
  );
  return module.exports;
}
function hooks() {
  const slots = []; let cursor = 0; let layouts = []; let effects = [];
  const same = (left, right) => left && right && left.length === right.length && left.every((value, index) => Object.is(value, right[index]));
  function effect(callback, dependencies, queue) {
    const index = cursor++; const previous = slots[index];
    if (!previous || !same(previous.dependencies, dependencies)) {
      queue.push(() => { previous?.cleanup?.(); slots[index] = { dependencies, cleanup: callback() }; });
    }
  }
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useMemo(callback, dependencies) { const index = cursor++; if (!slots[index] || !same(slots[index].dependencies, dependencies)) slots[index] = { dependencies, value: callback() }; return slots[index].value; },
    useCallback(callback, dependencies) { return react.useMemo(() => callback, dependencies); },
    useEffect(callback, dependencies) { effect(callback, dependencies, effects); },
    useLayoutEffect(callback, dependencies) { effect(callback, dependencies, layouts); },
  };
  return { react, render(callback) { cursor = 0; layouts = []; effects = []; const result = callback(); layouts.forEach(run => run()); effects.forEach(run => run()); return result; },
    cleanup() { slots.forEach(slot => slot?.cleanup?.()); } };
}
const navigationLogic = load('src/lib/screen-navigation.ts');
const inventoryLabels = load('src/features/inventory/inventory.labels.ts', {
  '@/lib/number-format': load('src/lib/number-format.ts'),
  './inventory.types': load('src/features/inventory/inventory.types.ts'),
});
function navigationTree() {
  return { key: 'root', type: 'stack', stale: false, routeNames: ['(app)', '(account)'], index: 1, routes: [
    { key: 'app', name: '(app)', state: { type: 'tab', stale: false, index: 1, history: [{ type: 'route', key: 'tasks-tab' }], routes: [
      { key: 'home', name: 'index', params: { selectedWarehouse: 'warehouse' } },
      { key: 'tasks-tab', name: 'tasks', state: { type: 'stack', stale: false, index: 1, routes: [
        { key: 'task-list', name: 'index', params: { status: 'InProgress' } }, { key: 'task-detail', name: '[taskType]/[taskId]' },
      ] } },
      { key: 'catalog', name: 'catalog', params: { filter: 'keep' } },
    ] } }, { key: 'account', name: '(account)', state: { type: 'stack', index: 0, routes: [{ name: 'receiving/[id]' }] } },
  ] };
}
test('Home removes account/current task flow while preserving Home identity, warehouse and other tab filters', () => {
  const source = navigationTree(); const before = structuredClone(source);
  const result = navigationLogic.homeNavigationState(source);
  assert.deepEqual(source, before);
  assert.equal(result.routes.length, 1);
  const tabs = result.routes[0].state;
  assert.equal(tabs.index, 0); assert.equal(tabs.routes[0].key, 'home');
  assert.deepEqual(tabs.routes[0].params, { selectedWarehouse: 'warehouse' });
  assert.deepEqual(tabs.routes[2].params, { filter: 'keep' });
  assert.equal(tabs.routes[1].state.routes.length, 1);
  assert.deepEqual(tabs.routes[1].state.routes[0].params, { status: 'InProgress' });
  assert.deepEqual(tabs.history, [{ type: 'route', key: 'home' }]);
});
test('task completion returns to actual task list and deep-link fallback builds the signed-in shell', () => {
  const tasks = navigationLogic.homeNavigationState(navigationTree(), 'tasks');
  assert.equal(tasks.routes[0].state.index, 1);
  assert.deepEqual(tasks.routes[0].state.routes[1].state.routes.map(route => route.name), ['index']);
  assert.equal(navigationLogic.homeNavigationState({ routes: [{ name: '(account)' }] }).routes[0].name, '(app)');
  assert.equal(navigationLogic.homeNavigationState({ routes: [] }, 'tasks').routes[0].state.routes[0].name, 'tasks');
});

function boundaryFixture({ canGoBack = false, missingOwner = false, deepLink = false } = {}) {
  const runtime = hooks(); const alerts = []; const errors = []; const actions = []; const queued = [];
  const session = { signedIn: true }; const selection = { identity: 'user', warehouseId: 'warehouse', revision: 1, signature: 'scope' };
  let focused = true; let removal; let focusListener;
  const replayed = new WeakSet();
  const wrapperActions = [];
  const wrapper = { getParent: () => undefined,
    getState: () => ({ key: 'expo-root', type: 'stack', routeNames: ['__root', '+not-found', '_sitemap'], index: 0, routes: [{ name: '__root', state: navigationTree() }] }),
    dispatch: action => wrapperActions.push(action) };
  const owner = { getParent: () => wrapper,
    getState: () => missingOwner ? wrapper.getState() : deepLink ? { ...navigationTree(), index: 0, routes: [{ name: '(account)' }] } : navigationTree(),
    dispatch(action) { navigation.dispatch(action); } };
  const navigation = { getParent: () => owner, getState: () => ({ key: 'account', type: 'stack', routeNames: ['receiving/[id]'], index: 0, routes: [{ name: 'receiving/[id]' }] }), isFocused: () => focused, canGoBack: () => canGoBack, setOptions() {},
    addListener: (_, listener) => { focusListener = listener; return () => {}; },
    dispatch(action) { if (!replayed.has(action)) { replayed.add(action); removal({ data: { action } }); } else actions.push(action); } };
  const jsx = (type, props) => ({ type, props });
  const { ScreenExitBoundary } = load('src/providers/screen-exit-boundary.tsx', {
    react: runtime.react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Alert: { alert: (title, message, buttons, options) => alerts.push({ title, message, buttons, options }) }, View: 'View', StyleSheet: { create: value => value } },
    'expo-router': { router: { canGoBack: () => canGoBack, back: () => queued.push({ type: 'GO_BACK' }), replace: route => queued.push({ replace: route }) }, useNavigation: () => navigation, usePathname: () => '/receiving/document' },
    'expo-router/react-navigation': { CommonActions: { goBack: () => ({ type: 'GO_BACK' }), reset: payload => ({ type: 'RESET', payload }) }, useIsFocused: () => focused, usePreventRemove: (_, handler) => { removal = handler; } },
    '@tanstack/react-query': { useQueryClient: () => ({ getQueryData: () => ({ permissions: ['tasks'] }) }) },
    'sonner-native': { toast: { error: message => errors.push(message) } },
    '@/components/work-screen-header': { WorkScreenHeader: 'WorkScreenHeader', NavigationIcon: 'NavigationIcon' },
    '@/features/auth/auth.store': { useAuth: Object.assign(selector => selector(session), { getState: () => session }) },
    '@/features/auth/auth.permissions': { getAllowedTabs: () => [{ name: 'tasks' }] },
    '@/features/warehouse-access/warehouse-access': {},
    '@/features/warehouse-access/warehouse-access.store': { useWarehouseSelection: Object.assign(() => selection, { getState: () => selection }) },
    '@/hooks/use-screen-exit': { ScreenExitContext: { Provider: 'ExitProvider' } },
    '@/lib/api-error': { getApiErrorMessage: failure => failure.message }, '@/lib/screen-navigation': navigationLogic,
  });
  const render = () => runtime.render(() => ScreenExitBoundary({ children: 'screen', standalone: true })).props.value;
  return { render, alerts, errors, actions, wrapperActions, queued, selection, session, navigation, remove: action => removal({ data: { action } }),
    focus: () => { focused = true; focusListener(); }, blur: () => { focused = false; }, cleanup: runtime.cleanup };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

function securityFixture({ loading = false, dirty = false, busy = false } = {}) {
  const f = boundaryFixture({ canGoBack: true }); const exit = f.render();
  const jsx = (type, props) => ({ type, props });
  const { default: SecurityScreen } = load('src/app/(account)/security.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@hookform/resolvers/zod': { zodResolver: () => undefined },
    '@tanstack/react-query': { useQueryClient: () => ({}), useQuery: () => ({ isPending: loading, data: { isTwoFactorEnabled: false } }),
      useMutation: () => ({ isPending: busy, reset() {} }) },
    'expo-router': { router: { replace: route => f.queued.push({ type: 'REPLACE', payload: { route } }) } },
    'react-hook-form': { useForm: () => ({ formState: { isDirty: dirty }, reset() {}, resetField() {}, handleSubmit: callback => callback }) },
    '@/features/auth/auth.api': { authApi: {} }, '@/features/auth/auth.schema': { otpSchema: {} },
    '@/features/auth/auth.store': { useAuth: selector => selector({ clearSession() {} }) },
    '@/features/auth/components/auth-form': { AuthFrame: 'AuthFrame', Feedback: 'Feedback', DetailText: 'DetailText', ActionButton: 'ActionButton', FormField: 'FormField' },
    '@/features/auth/components/two-factor-setup': { TwoFactorSetupDetails: 'TwoFactorSetupDetails' },
    '@/hooks/use-screen-exit': { useScreenExit: () => exit, useExitProtection: read => exit.register(read) },
  });
  return { ...f, screen: SecurityScreen() };
}

test('Security uses header Back without an in-content Profile exit in loading and loaded states', async () => {
  for (const loading of [true, false]) {
    const f = securityFixture({ loading });
    assert.equal(f.screen.props.onBack, undefined); assert.equal(f.screen.props.backLabel, undefined);
    f.render().back(); await tick();
    assert.equal(f.queued.length, 0); assert.equal(f.wrapperActions.length, 0);
    assert.deepEqual(f.actions, [{ type: 'GO_BACK' }]);
    assert.equal(f.alerts.length, 0); f.cleanup();
  }
});

test('Security header Back still protects dirty forms and pending writes', async () => {
  for (const busy of [false, true]) {
    const f = securityFixture({ dirty: true, busy }); f.render().back();
    await tick();
    assert.equal(f.actions.length, 0); assert.equal(f.alerts.length, 1);
    if (!busy) { f.alerts[0].buttons[0].onPress(); await tick(); }
    assert.equal(f.render().leaving, false); f.cleanup();
  }
  const f = securityFixture({ dirty: true }); f.render().back(); await tick();
  f.alerts[0].buttons.find(button => /Bỏ/.test(button.text)).onPress(); await tick();
  assert.equal(f.actions.length, 1); assert.equal(f.alerts.length, 1); f.cleanup();
});

test('opening audit from an uncertain pick report preserves the marker and navigates synchronously only after approval', async () => {
  for (const cancel of [true, false]) {
    const f = boundaryFixture(); const exit = f.render(); const order = [];
    exit.register(() => ({ pending: true, preservePending: async () => { order.push('preserved'); } }));
    const jsx = (type, props) => ({ type, props });
    const { PickIssueReportModal } = load('src/features/stock-issue/components/pick-issue-report-modal.tsx', {
      'react/jsx-runtime': { jsx, jsxs: jsx }, '@/hooks/use-screen-exit': { useScreenExit: () => exit },
      'expo-router': { useNavigation: () => f.navigation, router: { push: route => f.queued.push(route) } },
      'expo-router/react-navigation': { CommonActions: { navigate: (name, params) => ({ type: 'NAVIGATE', payload: { name, params } }) } },
      'react-hook-form': { Controller: 'Controller' }, '@/components/ui/alert-banner': { AlertBanner: 'AlertBanner' },
      '@/components/ui/text-field': { TextField: 'TextField' }, '@/components/ui/button': { Button: 'Button' },
      '@/components/ui/confirmation-modal': { ConfirmationModal: 'ConfirmationModal' },
      '@/features/warehouse-task/components/field-action-modal': { FieldActionModal: 'FieldActionModal' },
    });
    const tree = PickIssueReportModal({ state: { active: true, uncertain: true, canReadAudit: true,
      attempt: { isSuccess: true }, mutation: { isPending: false }, form: {}, closeToAudit: () => order.push('closed') } });
    const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
    nodes(tree).find(node => node.props?.label === 'Mở nhật ký hoạt động').props.onPress(); await tick();
    assert.deepEqual(order, []); assert.equal(f.actions.length, 0);
    f.alerts[0].buttons[cancel ? 0 : 1].onPress(); await tick();
    assert.deepEqual(order, cancel ? [] : ['preserved', 'closed']); assert.deepEqual(f.queued, []);
    assert.equal(f.actions.length, cancel ? 0 : 1);
    if (!cancel) assert.deepEqual(f.actions[0].payload, { name: '(app)', params: { screen: 'catalog', params: { screen: 'audit-logs' } } });
    f.cleanup();
  }
});

test('Home and Tasks reset the app owner below Expo 57 __root without dispatching to the wrapper', async () => {
  for (const target of ['home', 'tasks']) {
    const f = boundaryFixture(); f.render()[target](); await tick();
    assert.equal(f.wrapperActions.length, 0);
    assert.equal(f.errors.length, 0);
    assert.equal(f.actions.length, 1);
    assert.equal(f.actions[0].payload.key, 'root');
    assert.equal(f.actions[0].payload.routes[0].name, '(app)');
    assert.equal(f.actions[0].payload.routes[0].state.index, target === 'home' ? 0 : 1);
    f.cleanup();
  }
});

test('a deep link without a mounted app route resets only the navigator that registers (app)', async () => {
  const f = boundaryFixture({ deepLink: true }); f.render().tasks(); await tick();
  assert.equal(f.wrapperActions.length, 0); assert.equal(f.actions.length, 1);
  assert.equal(f.actions[0].payload.routes[0].state.routes[0].name, 'tasks'); f.cleanup();
});

test('missing app navigator reports an error and unlocks exit without an invalid RESET', async () => {
  const f = boundaryFixture({ missingOwner: true }); f.render().home(); await tick();
  assert.equal(f.actions.length, 0); assert.equal(f.wrapperActions.length, 0);
  assert.equal(f.errors.length, 1); assert.equal(f.render().leaving, false);
  assert.equal(f.render().capture()(), true); f.cleanup();
});
test('one clean Home press resets once, cannot be double-tapped, and invalidates previous handoff leases', async () => {
  const f = boundaryFixture(); const exit = f.render(); const lease = exit.capture();
  exit.home(); exit.home(); assert.equal(lease(), false);
  await tick(); assert.equal(f.actions.length, 1); assert.equal(f.alerts.length, 0);
  assert.equal(f.actions[0].payload.routes[0].state.index, 0);
  assert.equal(f.render().leaving, true);
  f.blur(); assert.equal(f.render().capture()(), false); f.cleanup();
});
test('cancelling Home keeps form/modal and lets a fresh handoff check resume without accepting old responses', async () => {
  const f = boundaryFixture(); const exit = f.render(); let discarded = false;
  exit.register(() => ({ dirty: true, discard: async () => { discarded = true; } }));
  const lease = exit.capture(); const request = exit.request(() => f.actions.push('closed'));
  assert.equal(lease(), false); assert.equal(f.render().capture()(), false);
  f.alerts[0].buttons[0].onPress(); await request;
  assert.equal(discarded, false); assert.equal(f.actions.length, 0);
  assert.equal(f.render().capture()(), true); assert.equal(lease(), false); f.cleanup();
});
test('keeping a draft waits for durable write, blocks handoff throughout modal close, and reports storage failure', async () => {
  const f = boundaryFixture(); let finish; let closed = false;
  const exit = f.render(); const lease = exit.capture();
  exit.register(() => ({ dirty: true, keep: () => new Promise(resolve => { finish = resolve; }), discard: async () => {} }));
  const pending = exit.request(() => { assert.equal(exit.capture()(), false); closed = true; }, 'quay lại', true);
  f.alerts[0].buttons.find(button => /Giữ nháp/.test(button.text)).onPress(); await tick();
  assert.equal(closed, false); assert.equal(lease(), false); finish(); await pending;
  assert.equal(closed, true); assert.equal(f.render().capture()(), true); f.cleanup();
  const broken = boundaryFixture(); const state = broken.render();
  state.register(() => ({ dirty: true, keep: async () => { throw new Error('Storage failed'); } }));
  const attempt = state.request(() => broken.actions.push('wrong'));
  broken.alerts[0].buttons.find(button => /Giữ nháp/.test(button.text)).onPress(); await attempt;
  assert.deepEqual(broken.actions, []); assert.deepEqual(broken.errors, ['Storage failed']); broken.cleanup();
});
test('busy writes block exit; uncertain writes preserve metadata and never offer discard', async () => {
  const f = boundaryFixture(); const exit = f.render(); let busy = true; let saved = 0; let prepared = 0;
  exit.register(() => ({ busy, pending: true, dirty: true, preservePending: async () => { saved++; }, prepareClose: () => { prepared++; } }));
  await exit.request(() => f.actions.push('wrong'));
  assert.equal(f.actions.length, 0); assert.match(f.alerts[0].title, /Đang xử lý/);
  busy = false;
  const attempt = exit.request(() => f.actions.push('closed'), 'quay lại', true);
  assert.equal(f.alerts[1].buttons.length, 2); assert.ok(f.alerts[1].buttons.every(button => !/Bỏ|Giữ nháp/.test(button.text)));
  f.alerts[1].buttons[1].onPress(); await attempt;
  assert.equal(saved, 1); assert.equal(prepared, 1); assert.deepEqual(f.actions, ['closed']); f.cleanup();
});
test('scope changes and a newly uncertain send invalidate a previously approved exit dialog', async () => {
  for (const scenario of ['scope', 'pending']) {
    const f = boundaryFixture(); const exit = f.render(); let pending = false;
    exit.register(() => ({ dirty: true, pending, discard: async () => {}, preservePending: async () => {} }));
    const attempt = exit.request(() => f.actions.push('wrong'));
    if (scenario === 'scope') { f.selection.warehouseId = 'other'; f.selection.revision++; }
    else pending = true;
    f.alerts[0].buttons[1].onPress(); await attempt;
    assert.equal(f.actions.length, 0, scenario); f.cleanup();
  }
});
test('native removal uses the same dirty guard and replays only the approved original navigation action', async () => {
  const f = boundaryFixture(); f.render().register(() => ({ dirty: true, discard: async () => {} }));
  const action = { type: 'GO_BACK' }; f.remove(action);
  assert.equal(f.actions.length, 0); f.alerts[0].buttons[1].onPress(); await tick();
  assert.deepEqual(f.actions, [action]); f.cleanup();
});

test('header Back dispatches synchronously through its approved guard rather than the Expo Router queue', async () => {
  const f = boundaryFixture({ canGoBack: true }); const exit = f.render(); const lease = exit.capture();
  exit.back(); exit.back(); await tick();
  assert.deepEqual(f.actions, [{ type: 'GO_BACK' }]); assert.deepEqual(f.queued, []);
  assert.equal(lease(), false); f.blur(); assert.equal(f.render().leaving, false); f.cleanup();
});
test('Back from a deep link resets to the permitted task tab without queuing replace or re-opening the exit guard', async () => {
  const f = boundaryFixture(); f.render().back(); await tick();
  assert.equal(f.actions.length, 1); assert.equal(f.actions[0].type, 'RESET');
  assert.equal(f.actions[0].payload.routes[0].state.index, 1); assert.deepEqual(f.queued, []);
  assert.equal(f.alerts.length, 0); f.cleanup();
});

function storageFixture() {
  const values = new Map(); let rejecting = false;
  const secure = { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1, isAvailableAsync: async () => true,
    getItemAsync: async key => values.get(key) ?? null, deleteItemAsync: async key => { values.delete(key); },
    setItemAsync: async (key, value) => { if (rejecting) throw new Error('Storage failed'); values.set(key, value); } };
  const crypto = { CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_, value) => createHash('sha256').update(value).digest('hex') };
  const storage = load('src/lib/form-draft-storage.ts', { './secure-store': { SecureStore: secure }, 'expo-crypto': crypto }).formDraftStorage;
  return { storage, crypto, values, reject: value => { rejecting = value; } };
}
const scope = (document = 'inbound', line = 'new', user = 'user') => JSON.stringify(['api', user, 'warehouse', 'receipt', document, line]);
const record = (document, pending = false) => ({ scope: scope(document), version: 'v1', values: {}, pending });
const command = { operation: 'CreateReceipt', commandId: 'command-1', content: JSON.stringify({ receiptCode: 'PN001', privateNote: 'never persist payload' }), expectedVersion: 'v1', documentId: 'inbound' };
test('pending survives TTL, cannot be silently removed/overwritten and is isolated by account and document', async t => {
  let now = Date.now(); t.mock.method(Date, 'now', () => now);
  const f = storageFixture(); await f.storage.write(record('inbound', true), () => {});
  await f.storage.write(record('ordinary'), () => {});
  now += 2 * 86400000;
  assert.equal((await f.storage.read(scope())).pending, true);
  assert.equal(await f.storage.read(scope('ordinary')), null);
  await assert.rejects(f.storage.remove(scope()), /đối soát/);
  await assert.rejects(f.storage.write(record('inbound'), () => {}), /đối soát/);
  assert.equal((await f.storage.pending(scope('inbound', 'saved'))).length, 1);
  assert.equal((await f.storage.pending(scope('inbound', 'new', 'other'))).length, 0);
  assert.equal((await f.storage.pending(scope('unrelated'))).length, 0);
  await f.storage.remove(scope(), true); assert.equal(await f.storage.read(scope()), null);
});
test('normal draft eviction never removes unresolved commands, and a full pending store rejects before sending', async () => {
  const f = storageFixture();
  for (let index = 0; index < 12; index++) await f.storage.write(record(`pending-${index}`, true), () => {});
  await assert.rejects(f.storage.write(record('thirteenth', true), () => {}), /đối soát/);
  for (let index = 0; index < 12; index++) assert.equal((await f.storage.read(scope(`pending-${index}`))).pending, true);
  await f.storage.clear(); assert.equal(f.values.size, 0);
});
function draftFixture(store = storageFixture()) {
  const runtime = hooks(); let protection; const alerts = []; let dirty = true; let versionIsCurrent = true;
  const selection = { identity: 'user', warehouseId: 'warehouse' }; const session = { signedIn: true };
  let values = { receiptCode: 'PN001', scannedSlotCode: 'SCANNED', documentEvidenceIds: ['photo'] };
  const form = { formState: { get isDirty() { return dirty; } }, getValues: () => values,
    reset: next => { values = next ?? {}; dirty = false; }, watch: () => ({ unsubscribe() {} }) };
  const { useFormDraft } = load('src/hooks/use-form-draft.ts', {
    react: runtime.react, 'expo-crypto': store.crypto,
    'react-native': { Alert: { alert: (title, message, buttons) => alerts.push({ title, message, buttons }) }, AppState: { addEventListener: () => ({ remove() {} }) } },
    'sonner-native': { toast: { error() {}, success() {} } },
    '@/features/auth/auth.store': { useAuth: { getState: () => session } },
    '@/features/warehouse-access/warehouse-access.store': { useWarehouseSelection: Object.assign(() => selection, { getState: () => selection }) },
    '@/lib/api': { API_BASE_URL: 'api' }, '@/lib/api-error': { WorkflowBlockedError: load('src/lib/api-error.ts', { './logger': { logger: {} } }).WorkflowBlockedError, getApiErrorMessage: failure => failure.message,
      isApiErrorResponse: failure => typeof failure?.statusCode === 'number' && typeof failure?.message === 'string' },
    '@/lib/form-draft-storage': { formDraftStorage: store.storage }, './use-screen-exit': { useExitProtection: read => { protection = read; } },
  });
  const render = () => runtime.render(() => useFormDraft({ feature: 'receipt', documentId: 'inbound', lineId: 'new', version: 'v1', enabled: true, form,
    assertCurrent: () => { if (!versionIsCurrent) throw new Error('Version changed'); } }));
  return { store, render, protection: () => protection(), alerts, selection, form, session,
    stale: () => { versionIsCurrent = false; }, cleanup: runtime.cleanup };
}
test('draft flush keeps editable contents only, and stale server version still allows explicit local discard', async () => {
  const f = draftFixture(); const draft = f.render(); await tick();
  await draft.flushForExit(); const saved = await f.store.storage.read(scope());
  assert.equal(saved.values.receiptCode, 'PN001'); assert.equal(saved.values.scannedSlotCode, ''); assert.deepEqual(saved.values.documentEvidenceIds, []);
  f.stale(); await assert.rejects(draft.flushForExit(), /Version/);
  await draft.discardForExit(); assert.equal(await f.store.storage.read(scope()), null); f.cleanup();
});
test('metadata is durable before send, tracks create-to-submit receipt identity, and never persists request payload', async () => {
  const f = draftFixture(); const draft = f.render(); await tick();
  await draft.beforeSubmit(command); assert.equal(f.protection().busy, true);
  const saved = await f.store.storage.read(scope());
  assert.equal(saved.operation.commandId, 'command-1'); assert.equal(saved.operation.fingerprint.length, 64);
  assert.deepEqual(saved.values, {}); assert.ok(!JSON.stringify([...f.store.values.values()]).includes('never persist payload'));
  await draft.recordResult('saved-receipt');
  assert.equal((await f.store.storage.pending(scope('saved-receipt')))[0].operation.operation, 'CreateReceipt');
  await draft.beforeSubmit({ ...command, operation: 'SubmitReceipt', commandId: 'command-2', receiptId: 'saved-receipt', content: 'submit' }, true);
  draft.settled(); assert.equal(f.protection().busy, false); assert.equal(f.protection().pending, true);
  const recovered = await f.store.storage.pending(scope('saved-receipt'));
  assert.equal(recovered.length, 1); assert.equal(recovered[0].operation.operation, 'SubmitReceipt');
  await draft.preservePending(); await assert.rejects(draft.clear(), /đối soát/);
  await draft.clear(true); assert.equal(await f.store.storage.read(scope()), null); f.cleanup();
});
test('restart never removes pending on acknowledgment and blocks a newly generated replacement command', async () => {
  const store = storageFixture(); const first = draftFixture(store); const draft = first.render(); await tick();
  await draft.beforeSubmit(command); draft.settled(); first.cleanup();
  const reopened = draftFixture(store); const current = reopened.render(); await tick();
  assert.equal(reopened.protection().pending, true); assert.equal(reopened.alerts[0].buttons[0].onPress, undefined);
  await assert.rejects(current.beforeSubmit({ ...command, commandId: 'replacement' }));
  assert.equal((await store.storage.read(scope())).operation.commandId, command.commandId);
  await current.preservePending(); reopened.cleanup();
});
test('failed metadata write prevents request readiness; authoritative rejection restores an editable draft', async () => {
  const f = draftFixture(); const draft = f.render(); await tick(); f.store.reject(true);
  await assert.rejects(draft.beforeSubmit(command), /Storage failed/); assert.equal(f.protection().busy, false);
  assert.equal(f.protection().pending, false); f.store.reject(false);
  await draft.beforeSubmit(command); await draft.afterRejectedSubmit();
  assert.equal((await f.store.storage.read(scope())).pending, false);
  await draft.beforeSubmit({ ...command, commandId: 'corrected', content: 'corrected values' });
  assert.equal((await f.store.storage.read(scope())).operation.commandId, 'corrected');
  await draft.clear(true); f.cleanup();
});

test('command execution restores editable drafts only after a first authoritative400/422', async () => {
  for (const statusCode of [400, 422]) {
    const f = draftFixture(); const draft = f.render(); await tick(); let sends = 0; let resets = 0;
    const failure = Object.assign(new Error('Invalid barcode'), { statusCode });
    await assert.rejects(draft.execute(command, async () => { sends++; throw failure; }, () => { resets++; }), error => error === failure);
    assert.equal(f.protection().pending, false); assert.equal(f.protection().busy, false); assert.equal(resets, 1);
    assert.equal((await f.store.storage.read(scope())).pending, false);
    await draft.execute({ ...command, commandId: 'corrected', content: 'correct barcode' }, async () => { sends++; });
    assert.equal(sends, 2); await draft.clear(true); f.cleanup();
  }
});
test('a rejection after a lost response never unlocks the original command or allows corrected replacement', async () => {
  for (const statusCode of [0, 500, 409]) {
    const f = draftFixture(); const draft = f.render(); await tick(); let sends = 0; let resets = 0;
    await assert.rejects(draft.execute(command, async () => { sends++; throw Object.assign(new Error('Unknown outcome'), { statusCode }); }));
    await assert.rejects(draft.execute(command, async () => { sends++; throw Object.assign(new Error('Rejected replay'), { statusCode: 400 }); }, () => { resets++; }));
    await assert.rejects(draft.execute({ ...command, commandId: 'replacement', content: 'edited' }, async () => { sends++; }));
    assert.equal(sends, 2); assert.equal(resets, 0); assert.equal(f.protection().pending, true);
    assert.equal((await f.store.storage.read(scope())).operation.commandId, command.commandId); f.cleanup();
  }
});
test('failed durable recovery after a known rejection retains the pending marker and original request identity', async () => {
  const f = draftFixture(); const draft = f.render(); await tick(); let resets = 0;
  await assert.rejects(draft.execute(command, async () => {
    f.store.reject(true); throw Object.assign(new Error('Invalid barcode'), { statusCode: 400 });
  }, () => { resets++; }), /Chưa khôi phục.*Storage failed/);
  assert.equal(resets, 0); assert.equal(f.protection().pending, true); assert.equal(f.protection().busy, false);
  f.store.reject(false); assert.equal((await f.store.storage.read(scope())).operation.commandId, command.commandId); f.cleanup();
});
test('if another exit participant fails after a draft flush, the editor resumes dirty protection', async () => {
  const f = draftFixture(); f.render(); await tick(); const boundary = boundaryFixture(); const exit = boundary.render(); let closed = false;
  exit.register(() => f.protection());
  exit.register(() => ({ dirty: true, keep: async () => { throw new Error('Other draft failed'); } }));
  const attempt = exit.request(() => { closed = true; }, 'quay lại', true);
  boundary.alerts[0].buttons.find(button => /Giữ nháp/.test(button.text)).onPress(); await attempt;
  assert.equal(closed, false); assert.equal(f.protection().dirty, true);
  assert.deepEqual(boundary.errors, ['Other draft failed']); f.cleanup(); boundary.cleanup();
});

function stockIssueFixture(failures = [], dispatch = false, documentId = 'inbound') {
  const persisted = draftFixture(); const draft = persisted.render(); const runtime = hooks(); const requests = [];
  let mutation; let commandSequence = 0;
  const P = { STOCK_ISSUE_REQUESTS_VIEW: 'view', STOCK_ISSUE_REQUESTS_PICK: 'pick', STOCK_ISSUE_REQUESTS_DISPATCH: 'dispatch', NOTIFICATIONS_VIEW: 'notifications' };
  const profile = { id: 'user', permissions: Object.values(P) };
  const selection = { identity: 'user', warehouseId: 'warehouse', revision: 1, signature: 'scope' };
  const detail = { isSuccess: true, data: { version: 'v1', status: 'Picking', items: [] } };
  const actions = { data: { currentVersion: 'v1', allowedActions: dispatch ? ['Pick', 'Dispatch'] : ['Pick'] } };
  const invalidations = []; const realtime = {}; let focused = true;
  const client = { getQueryData: () => profile, invalidateQueries: options => { invalidations.push(options.queryKey); return Promise.resolve(); } };
  const notificationSchema = load('src/features/notifications/notifications.schema.ts', { '@/lib/dotnet-guid.schema': load('src/lib/dotnet-guid.schema.ts') }).notificationSchema;
  const { useStockIssue } = load('src/features/stock-issue/hooks/use-stock-issue.ts', {
    '@/features/inventory/inventory.labels': inventoryLabels,
    react: runtime.react, '@hookform/resolvers/zod': { zodResolver() {} }, 'react-hook-form': { useForm: () => persisted.form },
    'expo-router/react-navigation': { useIsFocused: () => focused },
    '@/features/notifications/notifications.schema': { notificationSchema },
    '@/features/notifications/hooks/use-notification-realtime': { useNotificationRealtime: (enabled, identity, signature, callback) => { Object.assign(realtime, { enabled, identity, signature, callback }); } },
    '@tanstack/react-query': { useQueryClient: () => client,
      useQuery: options => options.queryKey.includes('detail') ? detail : actions,
      useMutation: options => { mutation = options; return { reset() {} }; } },
    '@/hooks/use-form-draft': { useFormDraft: () => draft }, '@/config/permission-codes': { P }, '@/features/auth/auth.store': { useAuth: { getState: () => ({ signedIn: true }) } },
    '@/features/my-tasks/my-tasks': { taskScopeMatches: () => true },
    '@/lib/warehouse-command': { warehouseCommand: (previous, body) => previous?.content === JSON.stringify(body) ? previous : { commandId: `pick-${++commandSequence}`, content: JSON.stringify(body) } },
    '@/features/warehouse-access/hooks/use-warehouse-access': { useWarehouseAccess: () => ({ ready: true, selection, profile: { data: profile } }) },
    '@/features/warehouse-access/warehouse-access': { warehouseSnapshot: () => ({ activeUser: true, compatible: true, identity: 'user', signature: 'scope', warehouses: [{ id: 'warehouse' }] }) },
    '@/features/warehouse-access/warehouse-access.store': { useWarehouseSelection: { getState: () => selection } }, '@/lib/api-error': { logApiError() {} },
    '@/lib/dotnet-guid.schema': { nonEmptyDotNetGuidSchema: () => ({ safeParse: () => ({ success: true }) }) }, '../stock-issue': { assertPick() {}, outstandingPicks: () => dispatch ? [{ id: 'pick-A' }, { id: 'pick-B' }] : [] },
    '../stock-issue.api': { stockIssueApi: { destination: async () => ({ version: 'v1', slotId: 'staging', path: 'Chờ xuất' }), dispatch: async (_, body, guard) => { guard(); requests.push(structuredClone(body)); }, pick: async (_, body) => { requests.push(structuredClone(body)); const failure = failures[requests.length - 1]; if (failure) throw failure; } } },
    '../stock-issue.schema': { pickFormSchema: { parse: value => value } },
  });
  const state = runtime.render(() => useStockIssue(documentId));
  return { persisted, requests, detail, actions, profile, realtime, invalidations, selection, blur: () => { focused = false; }, render: () => runtime.render(() => useStockIssue(documentId)),
    sendDispatch: target => mutation.mutationFn(target), send: async scannedBarcode => {
    try { return await mutation.mutationFn({ key: state.contextKey, version: 'v1', action: 'Pick', values: { pickedQuantity: 2, scannedBarcode } }); }
    finally { mutation.onSettled(); }
  }, cleanup: () => { runtime.cleanup(); persisted.cleanup(); } };
}
test('stock issue realtime only invalidates its own document and never trusts the notification as authorization', () => {
  const documentId = '11111111-1111-4111-8111-111111111111';
  const f = stockIssueFixture([], true, documentId);
  try {
    assert.equal(f.realtime.enabled, true);
    f.realtime.callback({ referenceType: 'StockIssueRequest', referenceId: documentId, status: 'AuthorizedForDispatch' });
    assert.deepEqual(f.invalidations, [['warehouse', 'user', 'warehouse', 1, 'stock-issue', documentId]]);
    assert.equal(f.detail.data.status, 'Picking'); assert.equal(f.render().allowed('Dispatch'), false);
    for (const event of [null, {}, { referenceType: 'GoodsReceipt', referenceId: documentId },
      { referenceType: 'StockIssueRequest', referenceId: '22222222-2222-4222-8222-222222222222' },
      { referenceType: 'StockIssueRequest', referenceId: 'bad-id' }]) f.realtime.callback(event);
    assert.equal(f.invalidations.length, 1);
    f.realtime.callback(); assert.equal(f.invalidations.length, 2);
    f.blur(); f.render(); assert.equal(f.realtime.enabled, false);
    f.profile.permissions = ['view']; f.render(); assert.equal(f.realtime.enabled, false);
  } finally { f.cleanup(); }
});

test('dispatch waits for manager authorization and confirms the entire order with guarded version and command ID', async () => {
  const f = stockIssueFixture([], true); await tick();
  try {
    for (const status of ['ReleasedForPicking', 'Picking', 'Picked', 'Dispatched']) {
      f.detail.data.status = status;
      const state = f.render();
      assert.equal(state.allowed('Dispatch'), false);
      state.beginDispatch(); assert.equal(f.render().target, null);
    }
    f.detail.data.status = 'AuthorizedForDispatch';
    f.render().beginDispatch(); const target = f.render().target;
    assert.equal(target.action, 'Dispatch');
    await f.sendDispatch(target);
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].expectedVersion, 'v1');
    assert.ok(f.requests[0].commandId);
    assert.equal(Object.hasOwn(f.requests[0], 'pickDetailIds'), false);
    f.detail.data.status = 'Picked'; f.render();
    await assert.rejects(f.sendDispatch(target), /thay đổi/);
    f.detail.data.status = 'AuthorizedForDispatch'; f.actions.data.currentVersion = 'v2'; f.render();
    await assert.rejects(f.sendDispatch(target), /thay đổi/);
    f.actions.data.currentVersion = 'v1'; f.profile.permissions = ['view', 'pick']; f.render();
    await assert.rejects(f.sendDispatch(target), /quyền/);
    assert.equal(f.requests.length, 1);
  } finally { f.cleanup(); }
});

test('real picking hook resubmits a corrected barcode with a fresh command after known validation rejection', async () => {
  const f = stockIssueFixture([Object.assign(new Error('Mã quét không khớp'), { statusCode: 400 })]); await tick();
  await assert.rejects(f.send('WRONG')); assert.equal(f.persisted.protection().pending, false);
  await f.send('CORRECT'); assert.equal(f.requests.length, 2);
  assert.notEqual(f.requests[0].commandId, f.requests[1].commandId); assert.equal(f.requests[1].items[0].scannedBarcode, 'CORRECT'); f.cleanup();
});
test('real picking hook preserves the exact command after a timeout followed by a400replay rejection', async () => {
  const f = stockIssueFixture([new Error('Timeout'), Object.assign(new Error('Rejected replay'), { statusCode: 400 })]); await tick();
  await assert.rejects(f.send('ORIGINAL')); await assert.rejects(f.send('ORIGINAL'));
  assert.deepEqual(f.requests[1], f.requests[0]); await assert.rejects(f.send('EDITED'));
  assert.equal(f.requests.length, 2); assert.equal(f.persisted.protection().pending, true); f.cleanup();
});

function relocationFixture() {
  const persisted = draftFixture(); const draft = persisted.render(); const runtime = hooks();
  const line = { id: 'line', remainingQuantity: 2 };
  const task = { rowVersion: 'v1', executionStatus: 'InProgress', lines: [line] };
  const P = Object.fromEntries(['WAREHOUSE_TASKS_VIEW_OWN', 'WAREHOUSE_TASKS_MANAGE_OWN', 'WAREHOUSE_TASKS_ASSIGN', 'INVENTORY_VIEW', 'PRODUCTS_VIEW', 'UNITS_VIEW'].map(name => [name, name]));
  const profile = { id: 'user', permissions: Object.values(P) };
  const selection = { identity: 'user', warehouseId: 'warehouse', revision: 1, signature: 'scope' };
  const { useRelocation } = load('src/features/relocation/hooks/use-relocation.ts', {
    react: runtime.react, '@hookform/resolvers/zod': { zodResolver() {} },
    'react-hook-form': { useForm: () => persisted.form, useWatch: ({ name }) => name === 'quantity' ? 2 : '' },
    '@tanstack/react-query': { useQueryClient: () => ({}), useMutation: () => ({ reset() {} }),
      useQuery: options => options.queryKey.includes('source') || options.queryKey.includes('recommendations') ? {} : { isSuccess: true, data: task } },
    '@/hooks/use-form-draft': { useFormDraft: () => draft }, '@/config/permission-codes': { P }, '@/features/auth/auth.store': {},
    '@/features/my-tasks/my-tasks': {}, '@/features/my-tasks/my-tasks.api': {},
    '@/features/warehouse-access/hooks/use-warehouse-access': { useWarehouseAccess: () => ({ ready: true, selection, profile: { data: profile } }) },
    '@/features/warehouse-access/warehouse-access': {}, '@/features/warehouse-access/warehouse-access.store': {},
    '@/lib/api-error': { getApiErrorKind: () => 'unknown' }, '@/lib/dotnet-guid.schema': { nonEmptyDotNetGuidSchema: () => ({ safeParse: () => ({ success: true }) }) },
    '@/lib/warehouse-command': {}, '../relocation': {}, '../relocation.api': {}, '../relocation.schema': {},
  });
  const render = () => runtime.render(() => useRelocation('inbound'));
  render().openLine(line);
  Object.defineProperty(persisted.form.formState, 'isDirty', { get: () => true });
  return { render, persisted, cleanup: () => { runtime.cleanup(); persisted.cleanup(); } };
}
test('shared Keep/Discard decision closes the real relocation editor without running a second dirty-state dialog', async () => {
  for (const choice of ['keep', 'discard']) {
    const f = relocationFixture(); await tick(); const state = f.render(); assert.ok(state.activeEditor);
    const boundary = boundaryFixture(); const exit = boundary.render(); exit.register(() => f.persisted.protection());
    const attempt = exit.request(state.closeEditor, 'quay lại', true);
    boundary.alerts[0].buttons.find(button => choice === 'keep' ? /Giữ nháp/.test(button.text) : /Bỏ thay đổi/.test(button.text)).onPress();
    await attempt; const after = f.render();
    assert.equal(after.discard, false); assert.equal(after.activeEditor, null); assert.equal(boundary.alerts.length, 1);
    const saved = await f.persisted.store.storage.read(scope());
    if (choice === 'keep') { assert.equal(saved.pending, false); assert.equal(saved.values.lineId, 'line'); }
    else assert.equal(saved, null);
    f.cleanup(); boundary.cleanup();
  }
});

test('delivery/refusal exit guards reconcile attached IDs without mistaking upload or stale detail for attachment', async () => {
  for (const [moduleName, exportName, collection] of [
    ['use-document-evidence', 'useDocumentEvidence', 'documentEvidence'],
    ['use-refusal-evidence', 'useRefusalEvidence', 'refusalEvidence'],
  ]) {
    const runtime = hooks(); let protection; let uploads = 0;
    const receipt = { id: 'receipt', warehouseId: 'warehouse', version: 'v1', documentEvidence: [], refusalEvidence: [] };
    const context = { evidenceKey: 'user:warehouse:receipt:session', scope: { warehouseId: 'warehouse' },
      receipt: { data: receipt }, assertCurrent() {}, assertAction() {} };
    const module = load(`src/features/receiving/hooks/${moduleName}.ts`, {
      react: runtime.react,
      'expo-image-picker': { launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 20 }] }) },
      '@/config/permission-codes': { P: {} }, '@/lib/api-error': { getApiErrorMessage: failure => failure.message },
      '@/hooks/use-screen-exit': { useExitProtection: read => { protection = read; } },
      '../receiving.api': { receivingApi: { uploadEvidence: async () => ({ id: `photo-${++uploads}`, fileName: 'photo.jpg' }) } },
    });
    const render = () => runtime.render(() => module[exportName](context));
    await render().addPhoto('library'); render(); assert.equal(protection().photos, true);
    receipt.version = 'v2'; assert.equal(render().files.length, 1); // Saving a draft is not attachment.
    const previousSession = render(); previousSession.markAttached(['photo-1']);
    assert.equal(render().files.length, 0); assert.equal(protection().photos, false);
    // A stale detail response is still empty, but authoritative submit confirmation remains valid.
    await render().addPhoto('library'); assert.equal(render().files.length, 1);
    context.evidenceKey = 'new-session'; await render().addPhoto('library');
    previousSession.markAttached(['photo-3']); assert.equal(render().files.length, 1);
    receipt[collection] = [{ id: 'photo-3' }];
    assert.equal(render().files.length, 0); assert.equal(protection().photos, false);
    runtime.cleanup();
  }
});

test('handoff response racing a Home dialog is dropped, while a later fresh check may proceed after cancellation', async () => {
  const runtime = hooks(); let focusedEffect; let resolveDetail; let nextLeaseValid = true; const routes = [];
  const detail = { id: 'receipt', inboundRequestId: 'inbound', warehouseId: 'warehouse', version: 'v1', status: 'Approved',
    receivingAssignedTo: 'user', putAwayAssignedTo: 'user', receivingSlotId: 'staging', arrivalStockPostedAt: 'today',
    putAwayTaskExecutionStatus: 'Queued', items: [{ remainingPutAwayQuantity: 2 }] };
  const actions = { currentVersion: 'v1', allowedActions: ['PutAway'] };
  const leases = [];
  const exit = { leaving: false, capture: () => {
    const lease = { valid: nextLeaseValid }; leases.push(lease); return () => lease.valid;
  } };
  const context = { contextKey: 'scope', mode: 'receiving', documentId: 'inbound', receiptId: 'receipt', canView: true, userId: 'user',
    scope: { warehouseId: 'warehouse' }, assertCurrent() {}, receipt: { data: detail,
      refetch: () => new Promise(resolve => { resolveDetail = resolve; }) }, actions: { refetch: async () => ({ data: actions }) } };
  const { useReceiptHandoff } = load('src/features/receiving/hooks/use-receipt-handoff.ts', {
    react: runtime.react,
    'expo-router': { router: { replace: route => routes.push(route) }, useFocusEffect: callback => { focusedEffect = callback; } },
    'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    '@/config/permission-codes': { P: {} }, '@/hooks/use-screen-exit': { useScreenExit: () => exit },
  });
  runtime.render(() => useReceiptHandoff(context, false)); let stop = focusedEffect();
  leases[0].valid = false; // Home locks synchronously before the screen's next render.
  resolveDetail({ data: detail }); await tick(); assert.equal(routes.length, 0); stop();
  nextLeaseValid = true; stop = focusedEffect(); resolveDetail({ data: detail }); await tick();
  assert.equal(routes.length, 1); stop(); runtime.cleanup();
});


function notificationRealtimeFixture(startFailures = 0, transfer) {
  const runtime = hooks(); const invalidations = []; const refreshes = []; const connections = [];
  const app = { currentState: 'active', addEventListener: (_, callback) => { app.change = callback; return { remove() { app.change = null; } }; } };
  const access = { valid: true }; const options = { enabled: true, identity: 'user', signature: 'scope' };
  const client = { getQueryData: () => ({}), invalidateQueries: value => { invalidations.push(value.queryKey); return Promise.resolve(); } };
  const onRefresh = event => refreshes.push(event);
  class HubConnectionBuilder {
    withUrl(url, config) { this.config = config; return this; }
    configureLogging() { return this; } withAutomaticReconnect() { return this; }
    build() {
      const connection = { config: this.config, starts: 0, stops: 0, handlers: {}, joins: [],
        async invoke(method, id) { this.joins.push([method, id]); },
        on(name, callback) { this.handlers[name] = callback; }, off(name) { delete this.handlers[name]; },
        onreconnecting(callback) { this.reconnecting = callback; }, onreconnected(callback) { this.reconnected = callback; },
        onclose(callback) { this.closed = callback; },
        start() { this.starts++; return this.starts <= startFailures ? Promise.reject(new Error('offline')) : Promise.resolve(); },
        stop() { this.stops++; return Promise.resolve(); } };
      connections.push(connection); return connection;
    }
  }
  const { useNotificationRealtime } = load('src/features/notifications/hooks/use-notification-realtime.ts', {
    react: runtime.react, 'react-native': { AppState: app },
    '@microsoft/signalr': { HubConnectionBuilder, LogLevel: { None: 0 } },
    '@tanstack/react-query': { useQueryClient: () => client },
    '@/features/auth/auth.store': { useAuth: { getState: () => ({ signedIn: true }) } },
    '@/features/warehouse-access/warehouse-access': { profileQueryKey: ['profile'] },
    '@/lib/api': { API_BASE_URL: 'https://example.invalid/api' },
    '@/lib/token-storage': { tokenStorage: { get: async () => ({ accessToken: 'fixture-token' }) } },
    '../notifications': { assertNotificationContext: () => { if (!access.valid) throw new Error('revoked'); } },
  });
  const render = () => runtime.render(() => useNotificationRealtime(options.enabled, options.identity, options.signature, onRefresh, transfer));
  render();
  return { render, app, options, access, connections, invalidations, refreshes, cleanup: () => runtime.cleanup() };
}

test('notification realtime refreshes on event/start/reconnect and stops delivering after background, revocation or cleanup', async () => {
  const f = notificationRealtimeFixture();
  try {
    await tick(); assert.equal(f.render(), true);
    const connection = f.connections[0];
    const event = { referenceType: 'StockIssueRequest', referenceId: 'document' };
    connection.handlers.NotificationCreated(event); assert.equal(f.refreshes.at(-1), event);
    connection.reconnecting(); assert.equal(f.render(), false);
    connection.reconnected(); assert.equal(f.render(), true); assert.equal(f.refreshes.at(-1), undefined);
    f.access.valid = false; const before = f.refreshes.length;
    connection.handlers.NotificationCreated(event); assert.equal(f.refreshes.length, before);
    await assert.rejects(connection.config.accessTokenFactory(), /revoked/);
    f.access.valid = true;
    const lateEvent = connection.handlers.NotificationCreated;
    f.app.change('background'); assert.equal(f.render(), false); assert.equal(connection.stops, 1);
    lateEvent(event); assert.equal(f.refreshes.length, before);
    f.app.change('active'); f.render(); await tick();
    assert.equal(f.connections.length, 2); assert.equal(f.render(), true); assert.equal(f.refreshes.at(-1), undefined);
    const foreground = f.connections[1]; const lateForeground = foreground.handlers.NotificationCreated;
    f.options.enabled = false; f.render(); const closedCount = f.refreshes.length;
    lateForeground(event); assert.equal(f.refreshes.length, closedCount); assert.equal(foreground.stops, 1);
  } finally { f.cleanup(); }
});

test('notification realtime retries a failed initial connection and exhausted reconnect, and cancels timers when closed', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const f = notificationRealtimeFixture(1);
  try {
    await tick(); const connection = f.connections[0]; assert.equal(connection.starts, 1);
    context.mock.timers.tick(5_000); await tick(); assert.equal(connection.starts, 2); assert.equal(f.render(), true);
    connection.closed(); assert.equal(f.render(), false);
    context.mock.timers.tick(5_000); await tick(); assert.equal(connection.starts, 3); assert.equal(f.render(), true);
    connection.closed(); f.options.enabled = false; f.render();
    context.mock.timers.tick(60_000); await tick(); assert.equal(connection.starts, 3);
  } finally { f.cleanup(); }
});


function receiptRealtimeFixture(mode = 'receiving') {
  const runtime = hooks(); const routes = []; const invalidations = []; const realtime = {};
  const documentId = '11111111-1111-4111-8111-111111111111';
  const receiptId = '22222222-2222-4222-8222-222222222222';
  const selection = { identity: 'user', warehouseId: 'warehouse', revision: 1, signature: 'scope' };
  let selected = selection; let focused = true; let fetches = 0;
  const P = { GOODS_RECEIPTS_VIEW: 'view', GOODS_RECEIPTS_PUTAWAY: 'putaway', NOTIFICATIONS_VIEW: 'notifications' };
  const profile = { id: 'user', permissions: Object.values(P) };
  const server = { id: receiptId, inboundRequestId: documentId, warehouseId: 'warehouse', version: 'v1', status: 'PendingApproval',
    receivingAssignedTo: 'user', putAwayAssignedTo: 'user', receivingSlotId: 'staging', arrivalStockPostedAt: 'today',
    putAwayTaskExecutionStatus: 'Queued', items: [{ remainingPutAwayQuantity: 2 }] };
  const serverActions = { currentVersion: 'v1', allowedActions: [] };
  const receipt = { isSuccess: true, data: structuredClone(server), refetch: async () => {
    fetches++; receipt.data = structuredClone(server); return { data: receipt.data, isError: false };
  } };
  const actions = { data: structuredClone(serverActions), refetch: async () => {
    actions.data = structuredClone(serverActions); return { data: actions.data, isError: false };
  } };
  const client = { getQueryData: () => profile, invalidateQueries: options => {
    invalidations.push(options.queryKey); receipt.data = structuredClone(server); actions.data = structuredClone(serverActions);
    return Promise.resolve();
  } };
  const schema = load('src/features/notifications/notifications.schema.ts', { '@/lib/dotnet-guid.schema': load('src/lib/dotnet-guid.schema.ts') });
  const { useReceiptContext } = load('src/features/receiving/hooks/use-receipt-context.ts', {
    react: runtime.react, 'expo-router/react-navigation': { useIsFocused: () => focused },
    '@tanstack/react-query': { useQueryClient: () => client, useQuery: options => options.queryKey.includes('task')
      ? { data: { activeGoodsReceiptId: receiptId } } : options.queryKey.includes('receipt') ? receipt : actions },
    '@/features/notifications/notifications.schema': schema,
    '@/features/notifications/hooks/use-notification-realtime': { useNotificationRealtime: (enabled, identity, signature, callback) => { Object.assign(realtime, { enabled, callback }); } },
    '@/config/permission-codes': { P }, '@/features/auth/auth.store': { useAuth: { getState: () => ({ signedIn: true }) } },
    '@/features/my-tasks/my-tasks': { taskScopeMatches: scope => JSON.stringify(scope) === JSON.stringify(selected) },
    '@/features/warehouse-access/hooks/use-warehouse-access': { useWarehouseAccess: () => ({ ready: true, selection, profile: { data: profile } }) },
    '@/features/warehouse-access/warehouse-access': { profileQueryKey: ['profile'] },
    '@/features/warehouse-access/warehouse-access.store': { useWarehouseSelection: { getState: () => selected } },
    '@/lib/dotnet-guid.schema': { nonEmptyDotNetGuidSchema: () => ({ safeParse: () => ({ success: true }) }) },
    '../receiving': { assertReceivingContext() {} }, '../receiving.api': {},
  });
  const { useReceiptHandoff } = load('src/features/receiving/hooks/use-receipt-handoff.ts', {
    react: runtime.react, 'expo-router': { router: { replace: route => routes.push(route) },
      useFocusEffect: callback => runtime.react.useEffect(callback, [callback]) },
    'react-native': { AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) } },
    '@/hooks/use-screen-exit': { useScreenExit: () => null }, '@/config/permission-codes': { P },
  });
  const render = () => runtime.render(() => {
    const context = useReceiptContext(mode, mode === 'putaway' ? receiptId : documentId);
    useReceiptHandoff(context, false); return context;
  });
  render();
  return { render, server, serverActions, routes, realtime, invalidations, receiptId, documentId,
    fetches: () => fetches, blur: () => { focused = false; },
    changeWarehouse: () => { selected = { ...selection, warehouseId: 'other' }; }, cleanup: () => runtime.cleanup() };
}

test('receipt approval event refreshes the context and starts guarded putaway handoff without waiting for the poll timer', async () => {
  const f = receiptRealtimeFixture();
  try {
    await tick(); assert.equal(f.routes.length, 0); assert.equal(f.realtime.enabled, true);
    f.server.status = 'Approved'; f.server.version = 'v2';
    f.serverActions.currentVersion = 'v2'; f.serverActions.allowedActions = ['PutAway'];
    f.realtime.callback({ referenceType: 'GoodsReceipt', referenceId: f.receiptId });
    assert.deepEqual(f.invalidations, [['warehouse', 'user', 'warehouse', 1, 'receiving']]);
    f.render(); await tick();
    assert.deepEqual(f.routes, [{ pathname: '/(account)/putaway/[id]', params: { id: f.receiptId } }]);
    f.render(); await tick(); assert.equal(f.routes.length, 1);
  } finally { f.cleanup(); }
});

test('receipt realtime observes receiving and putaway references and ignores unrelated documents, malformed hints and stale warehouse scope', async () => {
  for (const mode of ['receiving', 'putaway']) {
    const f = receiptRealtimeFixture(mode);
    try {
      await tick();
      for (const event of [null, {}, { referenceType: 'StockIssueRequest', referenceId: f.receiptId },
        { referenceType: 'GoodsReceipt', referenceId: f.documentId }, { referenceType: 'GoodsReceipt', referenceId: 'bad-id' }])
        f.realtime.callback(event);
      assert.equal(f.invalidations.length, 0);
      f.realtime.callback({ referenceType: 'InboundRequest', referenceId: f.documentId });
      assert.equal(f.invalidations.length, mode === 'receiving' ? 1 : 0);
      f.realtime.callback({ referenceType: 'GoodsReceipt', referenceId: f.receiptId });
      const expected = mode === 'receiving' ? 2 : 1; assert.equal(f.invalidations.length, expected);
      f.realtime.callback(); assert.equal(f.invalidations.length, expected + 1);
      assert.equal(f.routes.length, 0);
      f.changeWarehouse(); f.realtime.callback(); assert.equal(f.invalidations.length, expected + 1);
      f.blur(); f.render(); assert.equal(f.realtime.enabled, false);
    } finally { f.cleanup(); }
  }
});

test('approval event does not hand off when manager keeps goods at receiving, assigns another worker or actions are stale', async () => {
  for (const change of [{ keptAtReceiving: true }, { putAwayAssignedTo: 'other' }, { staleActions: true }]) {
    const f = receiptRealtimeFixture();
    try {
      await tick(); Object.assign(f.server, { status: 'Approved', version: 'v2', ...change });
      Object.assign(f.serverActions, { currentVersion: change.staleActions ? 'v1' : 'v2', allowedActions: ['PutAway'] });
      f.realtime.callback({ referenceType: 'GoodsReceipt', referenceId: f.receiptId }); f.render(); await tick();
      assert.equal(f.routes.length, 0);
    } finally { f.cleanup(); }
  }
});


function scanAudioFixture({ modeFailure = false } = {}) {
  const runtime = hooks(); const warnings = []; const alerts = []; let failMode = modeFailure; let modeCalls = 0; let activeCalls = 0;
  const players = ['success', 'error'].map(name => ({ name, plays: 0, pauses: 0, seeks: [], isLoaded: true, listeners: new Set(),
    addListener(_, callback) { this.listeners.add(callback); return { remove: () => this.listeners.delete(callback) }; },
    emit(status) { if (status.isLoaded !== undefined) this.isLoaded = status.isLoaded; for (const listener of [...this.listeners]) listener(status); },
    play() { this.plays++; }, pause() { this.pauses++; }, async seekTo(seconds) { this.seeks.push(seconds); } }));
  const app = { currentState: 'active', addEventListener: (_, callback) => { app.change = callback; return { remove() { app.change = null; } }; } };
  const context = { Provider: 'AudioProvider' };
  const { ScanFeedbackProvider } = load('src/providers/scan-feedback-provider.tsx', {
    react: { ...runtime.react, createContext: () => context, useContext: () => null },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) }, 'react-native': { AppState: app, Alert: { alert: (...args) => alerts.push(args) } },
    'expo-audio': { useAudioPlayer: (source, options) => { assert.equal(options.downloadFirst, true); assert.equal(options.keepAudioSessionActive, true); return players[source]; },
      setIsAudioActiveAsync: async active => { activeCalls++; assert.equal(active, true); }, setAudioModeAsync: async mode => {
      modeCalls++; assert.equal(mode.playsInSilentMode, true); assert.equal(mode.shouldRouteThroughEarpiece, false);
      assert.equal(mode.shouldPlayInBackground, false); assert.equal(mode.allowsRecording, false);
      assert.equal(mode.interruptionMode, 'mixWithOthers');
      if (failMode) { failMode = false; throw new Error('no audio device'); }
    } },
    '../../assets/sounds/scan-success.wav': 0, '../../assets/sounds/scan-error.wav': 1,
    '@/lib/logger': { logger: { warn: message => warnings.push(message) } },
  });
  const tree = runtime.render(() => ScanFeedbackProvider({ children: 'screen' }));
  return { play: tree.props.value, players, app, warnings, alerts, activeCalls: () => activeCalls, modeCalls: () => modeCalls, cleanup: () => runtime.cleanup() };
}

test('root-owned scan audio replays distinct verdict tones, cancels superseded/background playback and survives camera teardown', async () => {
  const f = scanAudioFixture();
  try {
    f.play(true); await tick(); assert.equal(f.players[0].plays, 1); assert.deepEqual(f.players[0].seeks, [0]);
    f.play(false); await tick(); assert.equal(f.players[1].plays, 1); assert.equal(f.modeCalls(), 1);
    f.play(true); f.play(false); await tick(); assert.equal(f.players[0].plays, 1); assert.equal(f.players[1].plays, 2);
    let completeSeek; f.players[0].seekTo = () => new Promise(resolve => { completeSeek = resolve; });
    f.play(true); await tick(); f.app.change('background'); completeSeek(); await tick();
    assert.equal(f.players[0].plays, 1);
    f.app.change('active'); f.play(false); await tick(); assert.equal(f.players[1].plays, 3);
    const latePlay = f.play; f.cleanup(); latePlay(false); await tick(); assert.equal(f.players[1].plays, 3);
  } finally { f.cleanup(); }
});

test('scan validation drives audio and haptics once per accepted attempt, including final auto-close, without blocking on audio failure', async () => {
  const audio = scanAudioFixture({ modeFailure: true }); const runtime = hooks(); const verdicts = []; const vibrations = []; const warnings = [];
  let cameraClosed = false;
  const { useScanGuard } = load('src/features/scanner/hooks/use-scan-guard.ts', {
    react: runtime.react, 'expo-haptics': { NotificationFeedbackType: { Success: 'success', Error: 'error' },
      notificationAsync: async kind => { vibrations.push(kind); if (kind === 'success') throw new Error('haptics unavailable'); } },
    '@/providers/scan-feedback-provider': { useScanFeedback: () => valid => { verdicts.push(valid); audio.play(valid); } },
    '@/lib/logger': { logger: { warn: message => warnings.push(message), error() {} } },
  });
  const onScan = async code => {
    if (code === 'throw') throw new Error('invalid scan');
    if (code === 'silent') return;
    if (code === 'valid') cameraClosed = true;
    return code === 'valid';
  };
  const render = () => runtime.render(() => useScanGuard(onScan));
  try {
    await render().handleCode('valid'); await tick();
    assert.equal(cameraClosed, true); assert.equal(render().lastScan.isValid, true);
    assert.equal(audio.warnings.length, 1); assert.equal(warnings.length, 1);
    await render().handleCode('valid'); assert.equal(verdicts.length, 1);
    await render().handleCode('valid', { isManual: true }); await tick(); assert.equal(audio.players[0].plays, 1);
    await render().handleCode('wrong'); await tick(); assert.equal(audio.players[1].plays, 1);
    await render().handleCode('silent'); await render().handleCode('');
    assert.deepEqual(verdicts, [true, true, false]);
    await render().handleCode('throw'); await tick(); assert.deepEqual(verdicts, [true, true, false, false]);
    assert.deepEqual(vibrations, ['success', 'success', 'error', 'error']);
    assert.equal(render().lastScan.isValid, false); assert.equal(render().isProcessing, false);
  } finally { audio.cleanup(); runtime.cleanup(); }
});

test('bundled scan sounds contain a short high success beep and two low error beeps separated by silence', () => {
  function samples(name) {
    const wav = readFileSync(path.join(root, 'assets', 'sounds', `scan-${name}.wav`));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt16LE(22), 1); assert.equal(wav.readUInt32LE(24), 48000); assert.equal(wav.readUInt16LE(34), 16);
    return Array.from({ length: (wav.length - 44) / 2 }, (_, index) => wav.readInt16LE(44 + index * 2));
  }
  const success = samples('success'); const error = samples('error');
  const segment = (values, from, to) => values.slice(Math.round(from * 48000), Math.round(to * 48000));
  const frequency = values => values.reduce((count, value, index) => count + (index > 0 && value >= 0 && values[index - 1] < 0 ? 1 : 0), 0) / (values.length / 48000);
  assert.ok(Math.abs(frequency(segment(success, .04, .09)) - 1760) < 35);
  // Keep the browser-rendered gain/envelope, rather than amplifying a raw sampled square wave.
  assert.ok(success.every(value => Math.abs(value) <= .081 * 32768));
  assert.ok(error.every(value => Math.abs(value) <= .081 * 32768));
  assert.ok(success.some(value => Math.abs(value) > .06 * 32768));
  const rms = values => Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
  assert.ok(rms(segment(success, .04, .05)) < rms(segment(success, 0, .01)) * .1);
  assert.ok(segment(success, .095, .105).every(value => value === 0));
  assert.ok(Math.abs(frequency(segment(error, 0, .1)) - 330) < 20);
  assert.ok(segment(error, .145, .195).every(value => value === 0));
  assert.ok(segment(error, .2, .3).some(value => Math.abs(value) > 1000));
});


test('scan audio waits for native loading, restores playback and cancels load subscriptions on background or newer verdict', async () => {
  const f = scanAudioFixture();
  try {
    f.players[0].isLoaded = false;
    f.play(true); await tick(); assert.equal(f.players[0].plays, 0); assert.equal(f.players[0].listeners.size, 1);
    f.players[0].emit({ isLoaded: true }); await tick(); assert.equal(f.players[0].plays, 1);
    assert.equal(f.activeCalls(), 1); assert.equal(f.players[0].listeners.size, 0);
    f.players[0].isLoaded = false; f.play(true); await tick(); f.play(false); await tick();
    assert.equal(f.players[0].listeners.size, 0); assert.equal(f.players[1].plays, 1);
    f.play(true); await tick(); f.app.change('background'); await tick();
    assert.equal(f.players[0].listeners.size, 0); assert.equal(f.warnings.length, 0);
  } finally { f.cleanup(); }
});

test('manual sound diagnostics report a native load failure or timeout without generating a scan or vibration', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const f = scanAudioFixture();
  try {
    f.players[0].isLoaded = false; f.play(true, true); await tick();
    f.players[0].emit({ error: 'unreadable asset' }); await tick();
    assert.equal(f.alerts.length, 1); assert.match(f.alerts[0][1], /không đọc được/);
    f.play(true, true); await tick(); context.mock.timers.tick(3_000); await tick();
    assert.equal(f.alerts.length, 2); assert.match(f.alerts[1][1], /Không tải được/);
    assert.equal(f.players[0].listeners.size, 0); assert.equal(f.players[0].plays, 0);
  } finally { f.cleanup(); }
});


test('Android ended clips replay by seeking before waiting for isLoaded, without relying on another status event', async () => {
  const f = scanAudioFixture();
  try {
    for (const valid of [true, false]) {
      const player = f.players[valid ? 0 : 1];
      player.isLoaded = false; player.duration = valid ? .11 : .36;
      player.seekTo = async seconds => {
        player.seeks.push(seconds);
        // SDK Android: STATE_ENDED -> false; seekTo(0) -> READY -> true.
        player.isLoaded = true;
      };
      f.play(valid); await tick(); assert.equal(player.plays, 1);
      player.isLoaded = false;
      f.play(valid); await tick(); assert.equal(player.plays, 2);
      assert.equal(player.listeners.size, 0); assert.deepEqual(player.seeks, [0, 0]);
    }
    assert.equal(f.warnings.length, 0);
  } finally { f.cleanup(); }
});


test('draft restoration gate remains a rejected submit with inline text but does not produce a duplicate LogBox error', async () => {
  const logged = [];
  const errors = load('src/lib/api-error.ts', { './logger': { logger: {
    warn: message => logged.push(['warn', message]), error: message => logged.push(['error', message]),
  } } });
  const f = draftFixture();
  try {
    const draft = f.render();
    let blocked;
    try { await draft.beforeSubmit({ operation: 'Pick', commandId: 'command', content: 'body', expectedVersion: 'v1', documentId: 'inbound' }); }
    catch (failure) { blocked = failure; }
    assert.equal(blocked?.name, 'WorkflowBlockedError');
    assert.match(errors.getApiErrorMessage(blocked), /Đang kiểm tra bản nháp/);
    // Classes are evaluated once per fixture loader; use its public type for the logger regression.
    errors.logApiError(new errors.WorkflowBlockedError(blocked.message)); assert.deepEqual(logged, []);
    errors.logApiError(new Error('unexpected storage failure')); assert.equal(logged[0][0], 'error');
    errors.logApiError({ statusCode: 409, message: 'stale version' }); assert.equal(logged[1][0], 'warn');
    await tick();
  } finally { f.cleanup(); }
});


test('stock issue preserves editor and confirmation identity during refetch/error but blocks commands until current queries succeed', async () => {
  const f = stockIssueFixture([], true);
  try {
    await tick();
    const item = { id: 'item', pickLocations: [{ inventoryStockId: 'stock', slotCode: 'A01' }] };
    await f.render().beginPick(item, 'stock');
    const editor = f.render().editor; assert.ok(editor);
    for (const query of [f.detail, f.actions]) {
      query.isFetching = true;
      assert.equal(f.render().editor, editor); assert.equal(f.render().allowed('Pick'), false);
      await assert.rejects(f.send('valid'), /thay đổi/); assert.equal(f.requests.length, 0);
      query.isFetching = false; query.isError = true;
      assert.equal(f.render().editor, editor); assert.equal(f.render().allowed('Pick'), false);
      query.isError = false;
      assert.equal(f.render().editor, editor); assert.equal(f.render().allowed('Pick'), true);
    }
    f.detail.data.version = 'v2'; assert.equal(f.render().editor, null);
    f.detail.data.version = 'v1'; f.profile.permissions = ['view', 'dispatch']; assert.equal(f.render().editor, null);
    f.profile.permissions = ['view', 'pick', 'dispatch'];
    f.detail.data.status = 'AuthorizedForDispatch'; f.render().beginDispatch();
    const target = f.render().target; assert.ok(target);
    for (const query of [f.detail, f.actions]) {
      query.isFetching = true;
      assert.equal(f.render().target, target); assert.equal(f.render().allowed('Dispatch'), false);
      await assert.rejects(f.sendDispatch(target), /thay đổi/); assert.equal(f.requests.length, 0);
      query.isFetching = false; query.isError = true;
      assert.equal(f.render().target, target); assert.equal(f.render().allowed('Dispatch'), false);
      query.isError = false;
      assert.equal(f.render().target, target); assert.equal(f.render().allowed('Dispatch'), true);
    }
    f.actions.data.allowedActions = []; assert.equal(f.render().target, null);
    f.actions.data.allowedActions = ['Dispatch']; f.detail.data.status = 'Dispatched'; assert.equal(f.render().target, null);
  } finally { f.cleanup(); }
});


test('transfer realtime joins its authorized document, rejoins on recovery and ignores late events after disposal', async () => {
  const events = []; const subscription = { id: 'transfer-id', onChange: event => events.push(event) };
  const f = notificationRealtimeFixture(0, subscription);
  try {
    await tick(); const connection = f.connections[0];
    assert.deepEqual(connection.joins, [['JoinTransfer', 'transfer-id']]);
    assert.equal(events.length, 0);
    const changed = { transferId: 'transfer-id' }; connection.handlers.TransferChanged(changed);
    assert.deepEqual(events, [changed]);
    connection.reconnected(); await tick(); assert.equal(connection.joins.length, 2); assert.equal(events.length, 2);
    const late = connection.handlers.TransferChanged; f.options.enabled = false; f.render();
    late(changed); assert.equal(events.length, 2); assert.equal(connection.handlers.TransferChanged, undefined);
  } finally { f.cleanup(); }
});

test('transfer change hints retain current edits, match only the current transfer and do not clear a newer event during reload', () => {
  const runtime = hooks(); const calls = []; let focused = true;
  const access = { selection: { identity: 'user', signature: 'scope', warehouseId: 'warehouse', revision: 1 }, profile: { data: { permissions: ['notifications'] } } };
  const { useTransferChanges } = load('src/features/transfer-picking/hooks/use-transfer-changes.ts', {
    '@/lib/transfer-client': { transferClientId: 'this-session' },
    react: runtime.react, 'expo-router/react-navigation': { useIsFocused: () => focused },
    '@/config/permission-codes': { P: { NOTIFICATIONS_VIEW: 'notifications' } },
    '@/lib/dotnet-guid.schema': load('src/lib/dotnet-guid.schema.ts'),
    '@/features/notifications/hooks/use-notification-realtime': { useNotificationRealtime: (...args) => { calls.push(args); return true; } },
  });
  const id = '11111111-1111-4111-8111-111111111111';
  const render = () => runtime.render(() => useTransferChanges(id, access, true));
  try {
    render(); const transfer = calls.at(-1)[4]; assert.equal(calls.at(-1)[0], true);
    transfer.onChange({ transferId: 'bad' }); assert.equal(render().changed, false);
    transfer.onChange({ transferId: id, originClientId: 'this-session' }); assert.equal(render().changed, false);
    transfer.onChange({ transferId: '22222222-2222-4222-8222-222222222222' }); assert.equal(render().changed, false);
    transfer.onChange({ transferId: id }); assert.equal(render().changed, true);
    const seen = render().capture(); transfer.onChange({ transferId: id }); render().accept(seen); assert.equal(render().changed, true);
    render().accept(render().capture()); assert.equal(render().changed, false);
    transfer.onChange(); assert.equal(render().changed, true);
    access.selection.revision++; assert.equal(render().changed, false);
    focused = false; render(); assert.equal(calls.at(-1)[0], false);
  } finally { runtime.cleanup(); }
});


test('transfer receipt commands are blocked by pending realtime hints without discarding the form or changing quantities', async () => {
  const runtime = hooks(); let mutation; const sent = [];
  const profile = { permissions: ['view', 'receive'] };
  const selection = { identity: 'user', warehouseId: 'warehouse', signature: 'scope', revision: 1 };
  const state = { realtime: { changed: true }, canView: true, mode: 'PutAway', detail: {}, access: { selection, profile: { data: profile } },
    data: { document: { isLegacyWorkflow: false }, receipt: { version: 'v1', status: 'AwaitingPutAway' }, shipment: { putAwayTaskStatus: 'InProgress' } } };
  const { useTransferReceiptExecution } = load('src/features/transfer-receiving/hooks/use-transfer-receipt-execution.ts', {
    react: runtime.react, '@tanstack/react-query': { useQueryClient: () => ({ getQueryData: () => profile }),
      useMutation: options => { mutation = options; return { reset() {} }; } },
    '@/config/permission-codes': { P: { TRANSFERS_VIEW: 'view', TRANSFERS_RECEIVE: 'receive' } },
    '@/features/auth/auth.store': { useAuth: { getState: () => ({ signedIn: true }) } },
    '@/features/my-tasks/my-tasks': { taskScopeMatches: () => true },
    '@/features/warehouse-access/warehouse-access': { profileQueryKey: ['profile'], warehouseSnapshot: () => ({ activeUser: true, compatible: true, signature: 'scope' }) },
    '@/features/warehouse-access/warehouse-access.store': { useWarehouseSelection: { getState: () => selection } },
    '@/lib/api-error': { logApiError() {} }, '@/lib/warehouse-command': {},
    '../receiving': {}, '../transfer-receiving': { transferReceiptActionAllowed: () => true },
    '../transfer-receiving.api': { transferReceivingApi: { execute: async () => sent.push('write') } },
  });
  try {
    const result = runtime.render(() => useTransferReceiptExecution(state, 'transfer', 'shipment', { current: { execute: async (_, send) => send() } }));
    assert.equal(result.allowed('PutAway'), false);
    await assert.rejects(mutation.mutationFn({ action: 'PutAway', scopeKey: result.key, body: { expectedVersion: 'v1' } }), /Trạng thái/);
    assert.deepEqual(sent, []);
  } finally { runtime.cleanup(); }
});

test('receipt handoff navigates only after successful submission, fresh data and while the same screen is active', () => {
  const runtime = hooks(), routes = [], frames = new Map(); let frameId = 0, focused = true, eligible = true;
  const oldRequest = global.requestAnimationFrame, oldCancel = global.cancelAnimationFrame;
  global.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
  global.cancelAnimationFrame = id => frames.delete(id);
  const selection = { identity: 'user', warehouseId: 'warehouse', revision: 1, signature: 'scope' };
  const state = { mode: 'Receive', canView: true, detail: { isSuccess: true, isFetching: false }, realtime: { changed: false },
    access: { selection, profile: { data: { id: 'user', permissions: [] } } }, data: { document: {}, receipt: {} } };
  const { useTransferReceiptHandoff } = load('src/features/transfer-receiving/hooks/use-transfer-receipt-handoff.ts', {
    react: runtime.react, 'expo-router': { router: { replace: value => routes.push(value) } },
    'expo-router/react-navigation': { useIsFocused: () => focused }, '@/hooks/use-screen-exit': { useScreenExit: () => null },
    '@/features/auth/auth.store': { useAuth: { getState: () => ({ signedIn: true }) } },
    '@/features/my-tasks/my-tasks': { taskScopeMatches: () => true },
    '@/features/warehouse-access/warehouse-access.store': { useWarehouseSelection: { getState: () => selection } },
    '../transfer-receiving': { canContinueTransferPutaway: () => eligible },
  });
  const render = () => runtime.render(() => useTransferReceiptHandoff({ ...state }, 'transfer', 'shipment'));
  const flush = () => { for (const callback of frames.values()) callback(); frames.clear(); };
  try {
    render(); flush(); assert.equal(routes.length, 0);
    render().submitted(); state.detail.isFetching = true; render(); flush(); assert.equal(routes.length, 0);
    state.detail.isFetching = false; focused = false; render(); flush(); assert.equal(routes.length, 0);
    focused = true; eligible = false; render(); flush(); assert.equal(routes.length, 0);
    eligible = true; state.realtime.changed = true; render(); flush(); assert.equal(routes.length, 0);
    state.realtime.changed = false; render(); flush(); assert.equal(routes.length, 1);
    assert.deepEqual(routes[0], { pathname: '/(account)/transfer-putaway/[id]', params: { id: 'transfer', shipmentId: 'shipment' } });
    render(); flush(); assert.equal(routes.length, 1);
  } finally { runtime.cleanup(); global.requestAnimationFrame = oldRequest; global.cancelAnimationFrame = oldCancel; }
});

test('successful receipt submit remains locked on old data if its post-commit reload fails', async () => {
  const runtime = hooks(); let mutation; const calls = [];
  const profile = { permissions: ['view', 'receive'] }, selection = { identity: 'user', warehouseId: 'warehouse', signature: 'scope', revision: 1 };
  const state = { realtime: { changed: false }, canView: true, mode: 'Receive', detail: {}, access: { selection, profile: { data: profile } },
    data: { document: { isLegacyWorkflow: false }, receipt: { version: 'v1', status: 'Receiving' }, shipment: { receiveTaskStatus: 'InProgress' } },
    refresh: async () => { calls.push('fresh-read'); return { isError: true }; } };
  const { useTransferReceiptExecution } = load('src/features/transfer-receiving/hooks/use-transfer-receipt-execution.ts', {
    react: runtime.react, '@tanstack/react-query': { useQueryClient: () => ({ getQueryData: () => profile, invalidateQueries: async () => calls.push('invalidate') }),
      useMutation: options => { mutation = options; return { reset() {} }; } },
    '@/config/permission-codes': { P: { TRANSFERS_VIEW: 'view', TRANSFERS_RECEIVE: 'receive' } },
    '@/features/auth/auth.store': { useAuth: { getState: () => ({ signedIn: true }) } },
    '@/features/my-tasks/my-tasks': { taskScopeMatches: () => true },
    '@/features/warehouse-access/warehouse-access': { profileQueryKey: ['profile'], warehouseSnapshot: () => ({ activeUser: true, compatible: true, signature: 'scope' }) },
    '@/features/warehouse-access/warehouse-access.store': { useWarehouseSelection: { getState: () => selection } },
    '@/lib/api-error': { logApiError() {} }, '@/lib/warehouse-command': {},
    '../transfer-receiving': { transferReceiptActionAllowed: () => true }, '../transfer-receiving.api': {},
  });
  const render = () => runtime.render(() => useTransferReceiptExecution(state, 'transfer', 'shipment', { current: null }, () => calls.push('committed')));
  try {
    const before = render(); assert.equal(before.allowed('Submit'), true);
    await mutation.onSuccess({ clear: async () => calls.push('clear') }, { scopeKey: before.key, action: 'Submit', body: { expectedVersion: 'v1' } });
    assert.equal(render().allowed('Submit'), false); assert.match(render().notice, /không gửi thêm/);
    assert.ok(calls.indexOf('fresh-read') > calls.indexOf('clear'));
    assert.ok(calls.indexOf('committed') > calls.indexOf('clear'));
    assert.ok(calls.indexOf('committed') < calls.indexOf('fresh-read'));
  } finally { runtime.cleanup(); }
});

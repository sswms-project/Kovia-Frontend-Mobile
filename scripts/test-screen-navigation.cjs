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
    '@/lib/api': { API_BASE_URL: 'api' }, '@/lib/api-error': { getApiErrorMessage: failure => failure.message,
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

function stockIssueFixture(failures = []) {
  const persisted = draftFixture(); const draft = persisted.render(); const runtime = hooks(); const requests = [];
  let mutation; let commandSequence = 0;
  const P = { STOCK_ISSUE_REQUESTS_VIEW: 'view', STOCK_ISSUE_REQUESTS_PICK: 'pick', STOCK_ISSUE_REQUESTS_DISPATCH: 'dispatch' };
  const profile = { id: 'user', permissions: Object.values(P) };
  const selection = { identity: 'user', warehouseId: 'warehouse', revision: 1, signature: 'scope' };
  const detail = { isSuccess: true, data: { version: 'v1', items: [] } };
  const { useStockIssue } = load('src/features/stock-issue/hooks/use-stock-issue.ts', {
    react: runtime.react, '@hookform/resolvers/zod': { zodResolver() {} }, 'react-hook-form': { useForm: () => persisted.form },
    '@tanstack/react-query': { useQueryClient: () => ({ getQueryData: () => profile }),
      useQuery: options => options.queryKey.includes('detail') ? detail : { data: { currentVersion: 'v1', allowedActions: ['Pick'] } },
      useMutation: options => { mutation = options; return { reset() {} }; } },
    '@/hooks/use-form-draft': { useFormDraft: () => draft }, '@/config/permission-codes': { P }, '@/features/auth/auth.store': { useAuth: { getState: () => ({ signedIn: true }) } },
    '@/features/my-tasks/my-tasks': { taskScopeMatches: () => true },
    '@/lib/warehouse-command': { warehouseCommand: (previous, body) => previous?.content === JSON.stringify(body) ? previous : { commandId: `pick-${++commandSequence}`, content: JSON.stringify(body) } },
    '@/features/warehouse-access/hooks/use-warehouse-access': { useWarehouseAccess: () => ({ ready: true, selection, profile: { data: profile } }) },
    '@/features/warehouse-access/warehouse-access': { warehouseSnapshot: () => ({ activeUser: true, compatible: true, identity: 'user', signature: 'scope', warehouses: [{ id: 'warehouse' }] }) },
    '@/features/warehouse-access/warehouse-access.store': { useWarehouseSelection: { getState: () => selection } }, '@/lib/api-error': { logApiError() {} },
    '@/lib/dotnet-guid.schema': { nonEmptyDotNetGuidSchema: () => ({ safeParse: () => ({ success: true }) }) }, '../stock-issue': { assertPick() {}, outstandingPicks: () => [] },
    '../stock-issue.api': { stockIssueApi: { pick: async (_, body) => { requests.push(structuredClone(body)); const failure = failures[requests.length - 1]; if (failure) throw failure; } } },
    '../stock-issue.schema': { pickFormSchema: { parse: value => value } },
  });
  const state = runtime.render(() => useStockIssue('inbound'));
  return { persisted, requests, send: async scannedBarcode => {
    try { return await mutation.mutationFn({ key: state.contextKey, version: 'v1', action: 'Pick', values: { pickedQuantity: 2, scannedBarcode } }); }
    finally { mutation.onSettled(); }
  }, cleanup: () => { runtime.cleanup(); persisted.cleanup(); } };
}
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

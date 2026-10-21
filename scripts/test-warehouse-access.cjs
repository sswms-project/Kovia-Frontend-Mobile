const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { QueryClient } = require('@tanstack/react-query');

function loadSource(relative, dependencies = {}) {
  const filename = path.join(path.dirname(require.resolve('../package.json')), relative);
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(
    (name) => Object.hasOwn(dependencies, name) ? dependencies[name] : require(name), module, module.exports,
  );
  return module.exports;
}
const store = loadSource('src/features/warehouse-access/warehouse-access.store.ts');
const access = loadSource('src/features/warehouse-access/warehouse-access.ts', { './warehouse-access.store': store });
const codes = loadSource('src/config/permission-codes.ts').PermissionCodes;
const warehouse = (id, status = 'Active') => ({ id, warehouseCode: id, warehouseName: `Kho ${id}`, status });
const profile = (overrides = {}) => ({ id: 'user', tenantId: 'tenant', status: 'Active',
  permissions: [codes.viewOwnTasks], assignedWarehouses: [warehouse('A'), warehouse('B')], ...overrides });
const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
async function start(queryClient, data = profile()) {
  store.resetWarehouseSelection();
  const snapshot = access.warehouseSnapshot(data);
  await access.reconcileWarehouseAccess(queryClient, snapshot);
  return snapshot;
}

test('only assigned active warehouses are offered, deduplicated', () => {
  const snapshot = access.warehouseSnapshot(profile({ assignedWarehouses: [warehouse('A'), warehouse('A'), warehouse('B', 'Inactive')] }));
  assert.deepEqual(snapshot.warehouses.map((item) => item.id), ['A']);
  assert.equal(snapshot.compatible, true);
});
test('missing/unknown backend status fails closed', async () => {
  for (const status of [undefined, 'Disabled']) {
    const queryClient = client();
    const snapshot = await start(queryClient, profile({ assignedWarehouses: [warehouse('A'), { ...warehouse('B'), status }] }));
    assert.equal(snapshot.compatible, false);
    assert.equal(await access.selectWarehouse(queryClient, snapshot, 'A'), false);
    queryClient.clear();
  }
});
test('initial entry requires explicit selection, including a single warehouse', async () => {
  const queryClient = client();
  await start(queryClient, profile({ assignedWarehouses: [warehouse('A')] }));
  assert.equal(store.useWarehouseSelection.getState().warehouseId, null);
  assert.throws(() => access.warehouseQueryKey('tasks'));
  queryClient.clear();
});
test('empty assignments, inactive users and unassigned warehouse cannot start work', async () => {
  const queryClient = client();
  for (const data of [profile({ assignedWarehouses: [] }), profile({ status: 'Inactive' }), profile()]) {
    const snapshot = await start(queryClient, data);
    assert.equal(await access.selectWarehouse(queryClient, snapshot, 'FOREIGN'), false);
    if (data.status === 'Inactive') assert.equal(await access.selectWarehouse(queryClient, snapshot, 'A'), false);
  }
  queryClient.clear();
});
test('switch clears business caches, preserves profile and isolates query keys', async () => {
  const queryClient = client();
  const snapshot = await start(queryClient);
  queryClient.setQueryData(access.profileQueryKey, profile());
  await access.selectWarehouse(queryClient, snapshot, 'A');
  const oldKey = access.warehouseQueryKey('tasks');
  queryClient.setQueryData(oldKey, ['private-A']);
  await access.selectWarehouse(queryClient, snapshot, 'B');
  assert.equal(queryClient.getQueryData(oldKey), undefined);
  assert.ok(queryClient.getQueryData(access.profileQueryKey));
  assert.notDeepEqual(oldKey, access.warehouseQueryKey('tasks'));
  queryClient.clear();
});
test('permission change clears business data but retains a valid selection', async () => {
  const queryClient = client();
  const snapshot = await start(queryClient);
  await access.selectWarehouse(queryClient, snapshot, 'A');
  const oldKey = access.warehouseQueryKey('tasks');
  queryClient.setQueryData(oldKey, ['private']);
  const changed = profile({ permissions: [] });
  await access.reconcileWarehouseAccess(queryClient, access.warehouseSnapshot(changed));
  assert.equal(queryClient.getQueryData(oldKey), undefined);
  assert.equal(store.useWarehouseSelection.getState().warehouseId, 'A');
  assert.equal(access.hasWarehousePermission(changed, true, codes.viewOwnTasks), false);
  assert.equal(access.hasWarehousePermission(profile(), false, codes.viewOwnTasks), false);
  queryClient.clear();
});
test('revoked or inactive warehouse removes selection and clears cached data', async () => {
  for (const assignments of [[warehouse('B')], [warehouse('A', 'Inactive')]]) {
    const queryClient = client();
    const snapshot = await start(queryClient);
    await access.selectWarehouse(queryClient, snapshot, 'A');
    queryClient.setQueryData(access.warehouseQueryKey('tasks'), ['old']);
    await access.reconcileWarehouseAccess(queryClient, access.warehouseSnapshot(profile({ assignedWarehouses: assignments })));
    assert.equal(store.useWarehouseSelection.getState().warehouseId, null);
    assert.match(store.useWarehouseSelection.getState().notice, /không còn khả dụng/);
    assert.equal(queryClient.getQueryCache().getAll().length, 0);
    queryClient.clear();
  }
});
test('tenant/user changes never inherit selection', async () => {
  const queryClient = client();
  for (const identity of [{ tenantId: 'other' }, { id: 'other' }]) {
    const snapshot = await start(queryClient);
    await access.selectWarehouse(queryClient, snapshot, 'A');
    await access.reconcileWarehouseAccess(queryClient, access.warehouseSnapshot(profile(identity)));
    assert.equal(store.useWarehouseSelection.getState().warehouseId, null);
  }
  queryClient.clear();
});
test('pending writes block manual warehouse switch', async () => {
  const queryClient = client();
  const snapshot = await start(queryClient);
  await access.selectWarehouse(queryClient, snapshot, 'A');
  let finish;
  const mutation = queryClient.getMutationCache().build(queryClient, { mutationFn: () => new Promise((resolve) => { finish = resolve; }) });
  const pending = mutation.execute();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(await access.selectWarehouse(queryClient, snapshot, 'B'), false);
  assert.equal(store.useWarehouseSelection.getState().warehouseId, 'A');
  finish();
  await pending;
  queryClient.clear();
});
test('a late switch completion cannot restore selection after logout', async () => {
  const queryClient = client();
  const snapshot = await start(queryClient);
  let finish;
  queryClient.cancelQueries = () => new Promise((resolve) => { finish = resolve; });
  const pending = access.selectWarehouse(queryClient, snapshot, 'A');
  assert.throws(() => access.warehouseQueryKey('tasks'));
  store.resetWarehouseSelection();
  finish();
  assert.equal(await pending, false);
  assert.equal(store.useWarehouseSelection.getState().signature, null);
  assert.equal(store.useWarehouseSelection.getState().warehouseId, null);
  queryClient.clear();
});
test('access denied suspends scope until successful profile reconciliation', async () => {
  const queryClient = client();
  const snapshot = await start(queryClient);
  await access.selectWarehouse(queryClient, snapshot, 'A');
  store.suspendWarehouseAccess('Forbidden');
  assert.throws(() => access.warehouseQueryKey('tasks'));
  assert.equal(await access.selectWarehouse(queryClient, snapshot, 'B'), false);
  await access.reconcileWarehouseAccess(queryClient, snapshot);
  assert.equal(store.useWarehouseSelection.getState().warehouseId, 'A');
  assert.equal(store.useWarehouseSelection.getState().transitioning, false);
  queryClient.clear();
});
test('an in-flight old warehouse read is aborted on switch', async () => {
  const queryClient = client();
  const snapshot = await start(queryClient);
  await access.selectWarehouse(queryClient, snapshot, 'A');
  let aborted = false;
  const oldKey = access.warehouseQueryKey('tasks');
  const pending = queryClient.fetchQuery({ queryKey: oldKey, queryFn: ({ signal }) => {
    signal.addEventListener('abort', () => { aborted = true; });
    return new Promise(() => {});
  } }).catch(() => undefined);
  await access.selectWarehouse(queryClient, snapshot, 'B');
  await pending;
  assert.equal(aborted, true);
  assert.equal(queryClient.getQueryData(oldKey), undefined);
  queryClient.clear();
});

test('a status contract regression invalidates an already selected warehouse', async () => {
  const queryClient = client();
  const snapshot = await start(queryClient);
  await access.selectWarehouse(queryClient, snapshot, 'A');
  const key = access.warehouseQueryKey('tasks');
  queryClient.setQueryData(key, ['private']);
  await access.reconcileWarehouseAccess(queryClient, access.warehouseSnapshot(profile({
    assignedWarehouses: [warehouse('A'), warehouse('B'), warehouse('C', 'Unknown')],
  })));
  assert.equal(store.useWarehouseSelection.getState().warehouseId, null);
  assert.equal(queryClient.getQueryData(key), undefined);
  queryClient.clear();
});

test('unchanged profile after business403 stays blocked instead of retrying the failing query forever', async () => {
  const queryClient = client();
  const snapshot = await start(queryClient);
  await access.selectWarehouse(queryClient, snapshot, 'A');
  queryClient.setQueryData(access.warehouseQueryKey('tasks'), ['private']);
  store.useWarehouseSelection.setState({ deniedSignature: snapshot.signature });
  store.suspendWarehouseAccess('Forbidden');
  await access.reconcileWarehouseAccess(queryClient, snapshot);
  assert.equal(store.useWarehouseSelection.getState().signature, null);
  assert.equal(store.useWarehouseSelection.getState().transitioning, false);
  assert.throws(() => access.warehouseQueryKey('tasks'));
  await access.reconcileWarehouseAccess(queryClient, snapshot);
  assert.equal(store.useWarehouseSelection.getState().signature, null);
  store.useWarehouseSelection.setState({ deniedSignature: null });
  await access.reconcileWarehouseAccess(queryClient, snapshot);
  assert.equal(store.useWarehouseSelection.getState().signature, snapshot.signature);
  queryClient.clear();
});

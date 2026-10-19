const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
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
    const module = { exports: {} };
    cache.set(filename, module.exports);
    const output = ts.transpileModule(readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
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
const schemas = load('src/features/my-tasks/my-tasks.schema.ts');
const logic = load('src/features/my-tasks/my-tasks.ts');
const { P } = load('src/config/permission-codes.ts');
const { warehouseSnapshot } = load('src/features/warehouse-access/warehouse-access.ts');
const userId = '11111111-1111-1111-1111-111111111111';
const warehouseId = '22222222-2222-2222-2222-222222222222';
const taskId = '33333333-3333-3333-3333-333333333333';
const task = (overrides = {}) => ({ id: taskId, taskType: 'Receiving', referenceCode: 'IN-001', title: 'Nhận hàng',
  warehouseId, warehouseName: 'Kho A', status: 'Approved', executionStatus: 'Queued', priority: 'Normal',
  dueAt: null, deadlineStatus: 'NoDeadline', startedAt: null, completedAt: null, itemCount: 2, completedItemCount: 0,
  totalQuantity: 10, completedQuantity: 0, progressPercentage: 0, workSummary: '2 dòng', pauseReason: null,
  assignedTo: userId, assignedToName: 'Fixture', assignedAt: null, updatedAt: '2026-10-19T00:00:00Z',
  transferId: null, transferShipmentId: null, ...overrides });
const list = (items = [task()]) => ({ items, totalCount: items.length, pageNumber: 1, pageSize: 20,
  stats: { unassignedCount: 0, queuedCount: items.length, inProgressCount: 0, pausedCount: 0, dueSoonCount: 0, overdueCount: 0 } });
const profile = (overrides = {}) => ({ id: userId, tenantId: 'tenant', status: 'Active',
  permissions: [P.WAREHOUSE_TASKS_VIEW_OWN, P.WAREHOUSE_TASKS_MANAGE_OWN],
  assignedWarehouses: [{ id: warehouseId, warehouseCode: 'A', warehouseName: 'Kho A', status: 'Active' }], ...overrides });
const scope = () => { const snapshot = warehouseSnapshot(profile()); return { identity: snapshot.identity,
  signature: snapshot.signature, warehouseId, revision: 1 }; };
function apiFixture() {
  const calls = [];
  let response = list();
  const fixtureLoad = sourceLoader({ '@/lib/api': {
    api: {
      get: async (...args) => { calls.push(['get', ...args]); return { data: { data: response } }; },
      post: async (...args) => { calls.push(['post', ...args]); return { data: { data: null } }; },
    }, unwrap: (value) => value.data.data,
  } });
  return { api: fixtureLoad('src/features/my-tasks/my-tasks.api.ts').myTasksApi, calls, setResponse: (value) => { response = value; } };
}

test('query schema enforces server enum/page constraints and scopes every page to warehouse', () => {
  assert.equal(schemas.taskFiltersSchema.safeParse({ pageNumber: 0 }).success, false);
  assert.equal(schemas.taskFiltersSchema.safeParse({ taskType: 'Unknown' }).success, false);
  const parsed = schemas.taskFiltersSchema.parse({ pageNumber: 2, executionStatus: 'Paused' });
  assert.deepEqual(logic.taskListParams(warehouseId, parsed), { warehouseId, pageNumber: 2, pageSize: 20,
    executionStatus: 'Paused', recentlyAssignedFirst: false });
  assert.throws(() => logic.taskListParams('', parsed));
});
test('current/history endpoints, query filters and abort signal match the controller contract', async () => {
  const fixture = apiFixture();
  const signal = new AbortController().signal;
  await fixture.api.list(warehouseId, userId, schemas.taskFiltersSchema.parse({ taskType: 'Receiving', deadlineStatus: 'Overdue' }), signal);
  assert.equal(fixture.calls[0][1], '/my-warehouse-tasks');
  assert.equal(fixture.calls[0][2].params.warehouseId, warehouseId);
  assert.equal(fixture.calls[0][2].params.deadlineStatus, 'Overdue');
  assert.equal(fixture.calls[0][2].signal, signal);
  fixture.setResponse(list([task({ executionStatus: 'Completed' })]));
  await fixture.api.list(warehouseId, userId, schemas.taskFiltersSchema.parse({ history: true }));
  assert.equal(fixture.calls[1][1], '/my-warehouse-tasks/history');
  assert.equal('mineOnly' in fixture.calls[1][2].params, false);
  assert.equal('assignedTo' in fixture.calls[1][2].params, false);
  assert.equal('history' in fixture.calls[1][2].params, false);
});
test('foreign warehouse, foreign user, unassigned and invalid response data fail closed', async () => {
  const fixture = apiFixture();
  for (const changes of [{ warehouseId: taskId }, { assignedTo: taskId }, { assignedTo: null }, { taskType: 'Unknown' }]) {
    fixture.setResponse(list([task(changes)]));
    await assert.rejects(fixture.api.list(warehouseId, userId, schemas.taskFiltersSchema.parse({})));
  }
});
test('empty and multi-page responses retain server totals rather than guessing from current rows', async () => {
  const fixture = apiFixture();
  fixture.setResponse({ ...list([]), pageNumber: 2, totalCount: 25 });
  const response = await fixture.api.list(warehouseId, userId, schemas.taskFiltersSchema.parse({ pageNumber: 2 }));
  assert.equal(response.totalCount, 25);
  assert.equal(response.pageNumber, 2);
  assert.deepEqual(response.items, []);
});
test('only supported task types/current states expose start, pause and return', () => {
  assert.deepEqual(logic.availableTaskActions(task(), true), ['Start', 'Return']);
  assert.deepEqual(logic.availableTaskActions(task({ executionStatus: 'Paused' }), true), ['Start', 'Return']);
  assert.deepEqual(logic.availableTaskActions(task({ executionStatus: 'InProgress' }), true), ['Pause']);
  for (const state of ['Completed', 'Cancelled']) assert.deepEqual(logic.availableTaskActions(task({ executionStatus: state }), true), []);
  for (const type of ['Picking', 'DamagedStock']) assert.deepEqual(logic.availableTaskActions(task({ taskType: type }), true), []);
  assert.deepEqual(logic.availableTaskActions(task(), false), []);
  assert.deepEqual(logic.availableTaskActions(task(), true, true), []);
});
test('pause/return require trimmed reason capped at500; start does not require reason', () => {
  assert.equal(schemas.taskActionSchema.safeParse({ action: 'Start' }).success, true);
  for (const action of ['Pause', 'Return']) {
    assert.equal(schemas.taskActionSchema.safeParse({ action, reason: '   ' }).success, false);
    assert.equal(schemas.taskActionSchema.safeParse({ action, reason: 'a'.repeat(501) }).success, false);
    assert.equal(schemas.taskActionSchema.safeParse({ action, reason: 'a'.repeat(500) }).success, true);
  }
  assert.equal(schemas.taskActionSchema.parse({ action: 'Pause', reason: ' lý do ' }).reason, 'lý do');
});
test('action sends only declared body/route and preserves final dispatch context guard', async () => {
  const fixture = apiFixture();
  const guard = () => undefined;
  await fixture.api.action('Receiving', taskId, { action: 'Pause', reason: ' Lý do ' }, guard);
  assert.deepEqual(fixture.calls[0].slice(0, 3), ['post', `/my-warehouse-tasks/Receiving/${taskId}/actions`, { action: 'Pause', reason: 'Lý do' }]);
  assert.equal(fixture.calls[0][3].assertCurrentContext, guard);
  for (const type of ['Picking', 'DamagedStock']) assert.throws(() => fixture.api.action(type, taskId, { action: 'Start' }));
  assert.throws(() => fixture.api.action('Receiving', '../bad', { action: 'Start' }));
  assert.equal(fixture.calls.length, 1);
});
test('write guard rejects logout, revoked permission, warehouse activity and wrong owner', () => {
  assert.doesNotThrow(() => logic.assertTaskActionScope(scope(), task(), 'Start', profile(), true));
  assert.throws(() => logic.assertTaskActionScope(scope(), task(), 'Start', profile(), false));
  for (const data of [profile({ permissions: [] }), profile({ status: 'Inactive' }), profile({ assignedWarehouses: [] }), profile({ tenantId: 'other' })])
    assert.throws(() => logic.assertTaskActionScope(scope(), task(), 'Start', data, true));
  assert.throws(() => logic.assertTaskActionScope(scope(), task({ assignedTo: taskId }), 'Start', profile(), true));
  assert.throws(() => logic.assertTaskActionScope(scope(), task({ warehouseId: taskId }), 'Start', profile(), true));
  assert.throws(() => logic.assertTaskActionScope(scope(), task({ executionStatus: 'Completed' }), 'Start', profile(), true));
});
test('scope generation protects responses and callbacks after switch/permission refresh', () => {
  const original = scope();
  assert.equal(logic.taskScopeMatches(original, { ...original, transitioning: false }), true);
  for (const patch of [{ revision: 2 }, { warehouseId: taskId }, { identity: 'other' }, { signature: null }, { transitioning: true }])
    assert.equal(logic.taskScopeMatches(original, { ...original, transitioning: false, ...patch }), false);
});
test('date presentation handles absent or invalid server timestamps', () => {
  assert.equal(logic.taskDate(null), 'Chưa có');
  assert.equal(logic.taskDate('not-a-date'), 'Không xác định');
});

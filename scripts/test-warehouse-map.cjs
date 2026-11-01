const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function loader(overrides = {}) {
  const cache = new Map();
  function load(relative) {
    let filename = path.resolve(root, relative);
    if (!existsSync(filename)) filename += existsSync(`${filename}.ts`) ? '.ts' : '.tsx';
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} }; cache.set(filename, module);
    const output = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(name => {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}`);
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name));
      return require(name);
    }, module, module.exports);
    return module.exports;
  }
  return load;
}

const wid = '11111111-1111-1111-1111-111111111111';
const zid = '22222222-2222-2222-2222-222222222222';
const rid = '33333333-3333-3333-3333-333333333333';
const sid = '44444444-4444-4444-4444-444444444444';
const physical = { storageCapacity: null, storageCapacityUnit: null, physicalLength: null, physicalLengthUnit: null,
  physicalWidth: null, physicalWidthUnit: null, physicalHeight: null, physicalHeightUnit: null };
const geometry = { x: 100, y: 200, width: 100, height: 20, rotation: 0, zIndex: 0, color: null };
const capacity = { capacityType: 'None', capacity: null, capacityUnitId: null, capacityUnitName: null,
  capacityUnitSymbol: null, currentOccupancy: 0, capacityUsed: null, remainingCapacity: null, utilizationPercent: null,
  requiresCapacityConfiguration: false, onHandQuantity: 0, skuCount: 0 };
function scene() { return { warehouseId: wid, version: 4, canvas: { width: 1000, height: 1000, gridSize: 10 },
  zones: [{ id: zid, zoneCode: 'A', zoneName: 'Khu A', description: null, status: 'Active', rowVersion: '',
    isDefaultReceivingPoint: false, isDefaultIsolationPoint: false, isDefaultOutboundStagingPoint: false, ...physical, ...geometry }],
  racks: [{ id: rid, zoneId: zid, zoneCode: 'A', rackCode: 'R1', rackName: 'Kệ 1', description: null,
    status: 'Active', storageMode: 'SlotLevel', allowsMixedProducts: false, layoutShape: 'Standard', defaultSlotId: null,
    rowVersion: '', ...physical, ...capacity, ...geometry }],
  slots: [{ id: sid, zoneId: zid, rackId: rid, slotCode: 'S1', slotName: 'Ô 1', description: null,
    occupancyStatus: 'Occupied', isActive: true, isOutboundStaging: false, isIsolationPoint: false,
    allowsMixedProducts: false, rowVersion: '', ...physical, ...capacity }], decorations: [] }; }
const logic = loader()('src/features/warehouse-map/warehouse-map');

test('scene parser retains the full BE geometry, capacity and slot identity contract', () => {
  assert.deepEqual(logic.warehouseMapSchema.parse(scene()), scene());
});
test('regular slot resolves its rack and human-readable hierarchy, without inventing slot coordinates', () => {
  const target = logic.locateMapSlot(scene(), sid.toUpperCase());
  assert.equal(target.rack.id, rid); assert.equal(target.path, 'A / R1 / S1');
  assert.equal('x' in scene().slots[0], false);
});
test('rack-level default slots absent from slots array still resolve correctly', () => {
  const data = scene(); data.racks[0].defaultSlotId = sid; data.slots = [];
  assert.match(logic.locateMapSlot(data, sid).path, /Ô mặc định/);
});
test('missing, inactive, inconsistent or ambiguous targets do not guess a rack', () => {
  assert.equal(logic.locateMapSlot(scene(), wid), null);
  for (const change of [data => data.slots[0].isActive = false, data => data.racks[0].status = 'Inactive',
    data => data.zones[0].status = 'Inactive', data => data.slots[0].zoneId = wid,
    data => data.racks.push({ ...data.racks[0], id: wid, defaultSlotId: sid })]) {
    const data = scene(); change(data); assert.equal(logic.locateMapSlot(data, sid), null);
  }
});
test('unplaced rack remains identifiable but is never assigned an invented map position', () => {
  const data = scene(); data.racks[0].x = null;
  assert.equal(logic.placedRack(logic.locateMapSlot(data, sid).rack), false);
  assert.equal(logic.mapFocus(data, null), '0 0 1000 1000');
});
test('focus uses rotated centre bounds and stays inside the canvas', () => {
  const data = scene(); data.racks[0].rotation = 90;
  const [x, y, width, height] = logic.mapFocus(data, data.racks[0]).split(' ').map(Number);
  assert.equal(x + width / 2, 150); assert.equal(y + height / 2, 210);
  assert.ok(width >= 20 && height >= 100);
  data.racks[0].x = 0; data.racks[0].y = 0;
  assert.ok(logic.mapFocus(data, data.racks[0]).split(' ').map(Number).every(n => n >= 0));
});
test('map API uses the existing read-only endpoint and fails closed for a foreign warehouse', async () => {
  const calls = []; let response = scene();
  const api = loader({ '@/lib/api': { api: { get: async (...args) => { calls.push(args); return response; } }, unwrap: value => value } })
    ('src/features/warehouse-map/warehouse-map.api').warehouseMapApi;
  const signal = new AbortController().signal;
  await api.get(wid, signal);
  // Match WarehousesController.GetLayoutScene and the web API endpoint.
  assert.deepEqual(calls[0], [`/warehouses/${wid}/layout/scene`, { signal }]);
  response = { ...scene(), warehouseId: zid };
  await assert.rejects(api.get(wid), /không thuộc kho/);
  await assert.rejects(api.get(''));
  assert.equal(calls.length, 2);
  response = scene(); response.canvas.width = 0;
  await assert.rejects(api.get(wid), /Sơ đồ chưa đủ dữ liệu/);
});

function hookFixture() {
  const states = []; let cursor = 0; let config;
  let version = 'document-v1'; let ready = true;
  const access = { ready: true, warehouse: { id: wid }, profile: { data: { permissions: ['warehouses:view'] } },
    selection: { identity: 'tenant:user', signature: 'permissions', revision: 1 } };
  const query = { isSuccess: true, isFetching: false, isError: false, data: scene(), refetch() {} };
  const useMap = loader({
    react: { useCallback: callback => callback, useState(initial) { const key = cursor++;
      if (!(key in states)) states[key] = initial; return [states[key], value => states[key] = value]; } },
    '@tanstack/react-query': { useQuery: input => { config = input; return query; } },
    '@/features/warehouse-access/hooks/use-warehouse-access': { useWarehouseAccess: () => access },
    '@/features/warehouse-access/warehouse-access': { warehouseQueryKey: resource => ['warehouse', access.selection.identity, access.warehouse.id, access.selection.revision, resource] },
    '../warehouse-map.api': { warehouseMapApi: {} },
  })('src/features/warehouse-map/hooks/use-warehouse-map').useWarehouseMap;
  return { access, query, version: value => version = value, ready: value => ready = value,
    render: () => { cursor = 0; return useMap(version, ready); }, config: () => config };
}
test('map query opens only with current permission and selected warehouse', () => {
  const f = hookFixture(); let state = f.render(); assert.equal(f.config().enabled, false);
  state.open(zid, sid, 'Foreign'); state = f.render(); assert.equal(state.view.visible, false);
  state.open(wid, sid, 'Product'); state = f.render(); assert.equal(state.view.visible, true);
  assert.equal(f.config().enabled, true); assert.equal(state.view.title, 'Product');
  state.close(); assert.equal(f.render().view.visible, false);
});
test('account, warehouse, permission or access revision changes immediately hide old target and cached scene', () => {
  for (const change of [f => f.access.selection.identity = 'other:user', f => f.access.warehouse.id = zid,
    f => f.access.profile.data.permissions = [], f => f.access.selection.revision++, f => f.access.ready = false]) {
    const f = hookFixture(); f.render().open(wid, sid, 'Old product'); change(f);
    const state = f.render(); assert.equal(state.view.visible, false); assert.equal(state.view.scene, null);
    assert.equal(state.view.title, ''); assert.equal(f.config().enabled, false);
  }
});
test('a map refresh or error never presents cached geometry as a fresh location', () => {
  const f = hookFixture(); f.render().open(wid, sid, 'Product'); f.query.isFetching = true;
  assert.equal(f.render().view.scene, null);
  f.query.isFetching = false; f.query.isSuccess = false; f.query.isError = true; f.query.error = new Error('Offline');
  assert.equal(f.render().view.scene, null); assert.equal(f.render().view.error, 'Offline');
});
test('source revalidation hides the map and changed document or stock versions invalidate the target', () => {
  const f = hookFixture(); f.render().open(wid, sid, 'Old allocation');
  f.ready(false); assert.equal(f.render().view.visible, false);
  f.version('document-v2'); f.ready(true);
  assert.equal(f.render().view.visible, false); assert.equal(f.config().enabled, false);
  f.render().open(wid, sid, 'Current allocation'); assert.equal(f.render().view.visible, true);
});

const jsx = (type, props) => ({ type, props });
function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)];
}
function uiLoader(react) {
  return loader({ react,
    '@/constants/theme': { FontFamily: { regular: 'regular', semibold: 'semibold', mono: 'mono' }, Radius: { lg: 12 } },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': { View: 'View', Text: 'Text', Modal: 'Modal', ScrollView: 'ScrollView', ActivityIndicator: 'Loading', StyleSheet: { create: value => value } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'react-native-svg': { default: 'Svg', G: 'G', Rect: 'Rect', Text: 'SvgText' },
    '@/hooks/use-theme': { useTheme: () => ({ background: '#fff', card: '#fff', text: '#111', textSecondary: '#444', primary: '#165c46', border: '#888' }) },
    '@/components/ui/button': { Button: 'Button' }, '@/components/ui/alert-banner': { AlertBanner: 'AlertBanner' },
    '@/components/ui/selection-field': { SelectionField: 'SelectionField' },
    '@/components/ui/work-details': { WorkDetails: 'WorkDetails' }, '@/components/ui/status-pill': { StatusPill: 'StatusPill' },
  });
}
test('stock picking map action follows the selected allocated source, not the first or another available stock', () => {
  let selected = ''; let located;
  const component = uiLoader({ memo: value => value, useState: () => [selected, value => selected = value] })
    ('src/features/stock-issue/components/stock-issue-item-card').StockIssueItemCard;
  const item = { sku: 'SKU', productName: 'Hàng', quantity: 5, pickedQuantity: 0, enteredUnitName: 'cái', conversionFactor: 1,
    pickDetails: [], pickLocations: [{ inventoryStockId: 'source1', slotId: sid, reservedQuantity: 3 },
      { inventoryStockId: 'source2', slotId: zid, reservedQuantity: 2 }] };
  const props = { item, canPick: true, busy: false, onPick() { throw Error('must not pick'); }, onReport() {},
    onLocate: (line, slot) => located = [line, slot] };
  nodes(component(props)).find(node => node.type === 'SelectionField').props.onChange('source2');
  nodes(component(props)).find(node => node.props?.label === 'Xem nguồn lấy trên sơ đồ').props.onPress();
  assert.deepEqual(located, [item, zid]);
  item.pickLocations = item.pickLocations.map(value => ({ ...value, reservedQuantity: 0 }));
  assert.equal(nodes(component(props)).some(node => node.props?.label === 'Xem nguồn lấy trên sơ đồ'), false);
});
test('map renderer shows a textual target and rotated rack, and has an explicit close action', () => {
  const component = uiLoader({ useState: () => [false, () => {}] })
    ('src/features/warehouse-map/components/warehouse-map-view').WarehouseMapView;
  const data = scene(); data.racks[0].rotation = 90; let closed = false;
  const tree = nodes(component({ visible: true, title: 'SKU · Hàng', slotId: sid, scene: data,
    loading: false, error: null, onClose: () => closed = true, onRefresh() {} }));
  assert.ok(tree.some(node => node.props?.children === 'A / R1 / S1'));
  assert.ok(tree.some(node => node.props?.transform === 'rotate(90 150 210)'));
  assert.ok(tree.some(node => node.props?.children === 'CẦN TÌM'));
  tree.find(node => node.props?.label === 'Đóng sơ đồ').props.onPress(); assert.equal(closed, true);
});
test('unplaced target displays a fallback instead of a fabricated location marker', () => {
  const component = uiLoader({ useState: () => [false, () => {}] })
    ('src/features/warehouse-map/components/warehouse-map-view').WarehouseMapView;
  const data = scene(); data.racks[0].x = null;
  const tree = nodes(component({ visible: true, title: 'SKU', slotId: sid, scene: data,
    loading: false, error: null, onClose() {}, onRefresh() {} }));
  assert.ok(tree.some(node => node.props?.title === 'Kệ chưa được đặt lên sơ đồ.'));
  assert.equal(tree.some(node => node.props?.children === 'CẦN TÌM'), false);
});

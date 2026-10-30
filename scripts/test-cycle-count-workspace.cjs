const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative, overrides = {}) {
  const filename = path.resolve(__dirname, '..', relative), module = { exports: {} };
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${source}\n})`, { filename })(name => overrides[name] ?? require(name), module, module.exports);
  return module.exports;
}
function runtime() {
  const slots = []; let cursor = 0;
  const react = { useState(value) { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
    useRef(value) { return slots[cursor++] ??= { current: value }; }, useEffect() {} };
  return { react, render(callback) { cursor = 0; return callback(); } };
}
const jsx = (type, props) => ({ type, props });
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
const scans = load('src/features/scanner/warehouse-scan.ts');
const rules = load('src/features/cycle-count/cycle-count.ts', { '@/features/scanner/warehouse-scan': scans });
function dependencies(run) {
  const result = { react: run.react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Text: 'Text', Switch: 'Switch', ScrollView: 'ScrollView', KeyboardAvoidingView: 'Root', Platform: { OS: 'android' }, StyleSheet: { create: value => value } },
    'react-hook-form': { Controller: 'Controller', useWatch: ({ control }) => control.values },
    'lucide-react-native': {}, '@/constants/theme': { FontFamily: {}, Radius: {} }, '@/hooks/use-theme': { useTheme: () => ({}) },
    '@/hooks/use-screen-exit': { useModalExit: close => close }, '@/features/inventory/inventory.labels': { formatInventoryLocation: item => item.rackCode || item.slotCode },
    '@/features/scanner/warehouse-scan': scans, '../cycle-count': rules };
  for (const [name, symbol] of [['@/components/ui/button', 'Button'], ['@/components/ui/selection-field', 'SelectionField'],
    ['@/components/ui/text-field', 'TextField'], ['@/components/ui/alert-banner', 'AlertBanner'], ['@/components/work-screen-header', 'WorkScreenHeader'],
    ['@/components/work-action-bar', 'WorkActionBar'], ['@/features/scanner/components/scan-code-button', 'ScanCodeButton']]) result[name] = { [symbol]: symbol };
  return result;
}
const item = { id: 'one', slotId: 'slot', rackCode: 'A01', slotCode: 'S01', productSku: 'SKU', productName: 'Hàng', productBarcode: 'BAR',
  countedQuantity: null, snapshotCapturedAt: 'now', qualityStatus: 'Good', lotNumber: 'LOT1', unitName: 'Cái' };
test('count scanner stays at the location, defers entry until camera closes and requires lot selection on ambiguous products', () => {
  const run = runtime(), opened = [];
  const { CountLineLocator } = load('src/features/cycle-count/components/count-line-locator.tsx', dependencies(run));
  const document = { status: 'Counting', items: [item] };
  const render = disabled => nodes(run.render(() => CountLineLocator({ document, disabled, onRecord: (...args) => opened.push(args) })));
  const camera = () => render(false).find(node => node.type === 'ScanCodeButton').props;
  camera().onOpen(); assert.equal(camera().onScan('S01'), true); assert.equal(camera().closeAfterScan(), false);
  assert.equal(camera().onScan('WRONG'), false); assert.equal(opened.length, 0);
  assert.equal(camera().onScan('BAR'), true); assert.equal(camera().closeAfterScan(), true); assert.equal(opened.length, 0);
  camera().onClose(); assert.equal(opened[0][0].id, 'one'); assert.equal(opened[0][1], 'BAR');
  document.items = [{ ...item, countedQuantity: 0 }, { ...item, id: 'two', lotNumber: 'LOT2' }, { ...item, id: 'three', lotNumber: 'LOT3' }];
  camera().onOpen(); assert.equal(camera().onScan('BAR'), true); assert.equal(camera().closeAfterScan(), true); camera().onClose();
  assert.equal(opened.length, 1);
  const choice = render(false).find(node => node.type === 'SelectionField' && node.props.label === 'Sản phẩm / lô / tình trạng hàng');
  assert.equal(choice.props.value, ''); assert.equal(choice.props.options.length, 2);
  choice.props.onChange('three'); render(false).find(node => node.type === 'Button' && node.props.label === 'Nhập số đếm').props.onPress();
  assert.equal(opened[1][0].id, 'three');
  assert.equal(render(true).find(node => node.type === 'ScanCodeButton').props.onScan('BAR'), false);
});
test('count editor scans increment actual quantity, accepts zero, never submits automatically, and reveals damage evidence only when needed', () => {
  const run = runtime(), removed = []; let reviewed = 0;
  const form = { values: { countedQuantity: NaN, countedDamagedQuantity: 0, scannedBarcode: '', countMethod: 'Manual' },
    getValues(name) { return this.values[name]; }, setValue(name, value) { this.values[name] = value; } }; form.control = form;
  const { CountEditor } = load('src/features/cycle-count/components/count-editor.tsx', dependencies(run));
  const render = () => nodes(run.render(() => CountEditor({ item, form, busy: false, canScan: true, submitDisabled: false,
    files: [{ id: 'photo', fileName: 'photo.jpg' }], onRemovePhoto: id => removed.push(id), onPhoto() {}, onReview: () => reviewed++, onClose() {} })));
  const camera = () => render().find(node => node.type === 'ScanCodeButton').props;
  assert.equal(render().some(node => node.type === 'Button' && node.props.label === 'Bỏ ảnh'), false);
  render().find(node => node.type === 'Switch').props.onValueChange(true);
  assert.equal(camera().onScan('WRONG'), false); assert.ok(Number.isNaN(form.values.countedQuantity));
  assert.equal(camera().onScan('BAR'), true); assert.equal(form.values.countedQuantity, 1);
  camera().onScan('SKU'); assert.equal(form.values.countedQuantity, 2); assert.equal(reviewed, 0);
  render().find(node => node.type === 'Button' && node.props.label === '−').props.onPress();
  render().find(node => node.type === 'Button' && node.props.label === '−').props.onPress(); assert.equal(form.values.countedQuantity, 0);
  assert.equal(render().find(node => node.type === 'Button' && node.props.label === '−').props.disabled, true);
  form.values.countedDamagedQuantity = 1;
  render().find(node => node.type === 'Button' && node.props.label === 'Bỏ ảnh').props.onPress(); assert.deepEqual(removed, ['photo']);
});

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
const walk = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(readFileSync(path.resolve(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const modules = {
    react: { memo: value => value }, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Text: 'Text', ScrollView: 'ScrollView', RefreshControl: 'RefreshControl', StyleSheet: { create: value => value } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'lucide-react-native': { Pause: 'Pause', Play: 'Play', Undo2: 'Undo2' },
    '@/components/ui/button': { Button: 'Button' }, '@/components/ui/status-pill': { StatusPill: 'StatusPill' },
    '@/components/ui/alert-banner': { AlertBanner: 'AlertBanner' }, '@/components/ui/work-details': { WorkDetails: 'WorkDetails' },
    '@/components/work-action-bar': { WorkActionBar: 'WorkActionBar' }, '@/constants/theme': { FontFamily: {}, Radius: {} },
    '@/hooks/use-theme': { useTheme: () => ({}) }, '@/lib/date-format': { formatDisplayDateTime: () => 'Ngày mẫu' },
    '@/lib/number-format': { formatQuantity: value => String(value) },
    '../warehouse-task.labels': { getTaskTypeLabel: () => 'Nhận hàng', EXECUTION_STATUS_LABEL: {}, EXECUTION_STATUS_TONE: {}, DEADLINE_STATUS_LABEL: {}, DEADLINE_STATUS_TONE: {} },
  };
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(name => { assert.ok(name in modules, name); return modules[name]; }, module, module.exports);
  return module.exports;
}
const { TaskDetailView } = load('src/features/warehouse-task/components/task-detail-view.tsx');
const task = { executionStatus: 'Queued', referenceCode: 'NK-42', warehouseName: 'Kho A', workSummary: 'Kiểm hàng', completedQuantity: 0, totalQuantity: 20, completedItemCount: 0, itemCount: 2, dueAt: null, startedAt: null, updatedAt: null, assignedAt: null };
test('task redesign keeps permission-provided actions and original callbacks, with Start before document navigation', () => {
  const events = [];
  const render = pending => walk(TaskDetailView({ task, availableActions: ['Start', 'Return'], isPending: pending,
    onAction: action => events.push(action), onOpenDocument: () => events.push('Open') }));
  const buttons = render(false).filter(node => node.type === 'Button');
  assert.deepEqual(buttons.map(node => node.props.label), ['Bắt đầu', 'Mở chứng từ và thực hiện', 'Trả lại công việc']);
  buttons.forEach(node => node.props.onPress()); assert.deepEqual(events, ['Start', 'Open', 'Return']);
  assert.ok(render(true).filter(node => node.type === 'Button').every(node => node.props.disabled || node.props.loading));
});
test('read-only tasks gain no execution actions and paused tasks retain direct Resume', () => {
  const readOnly = walk(TaskDetailView({ task, availableActions: [], isPending: false, onAction: () => assert.fail('No execution') }));
  assert.equal(readOnly.some(node => node.type === 'Button'), false);
  const events = [];
  const paused = walk(TaskDetailView({ task: { ...task, executionStatus: 'Paused', pauseReason: 'Chờ xác minh lô' }, availableActions: ['Start'], isPending: false, onAction: action => events.push(action) }));
  const resume = paused.find(node => node.type === 'Button'); assert.equal(resume.props.label, 'Tiếp tục'); resume.props.onPress(); assert.deepEqual(events, ['Start']);
});
const { ReceiptItemCard } = load('src/features/receiving/components/receipt-workspace/receipt-item-card.tsx');
test('damage requiring isolation remains outside collapsed details while actions retain permission and busy gates', () => {
  const item = { id: 'item', productName: 'Hàng mẫu', productSKU: 'SKU-A', baseUnitName: 'Cái', putAwayDetails: [], orderedQuantity: 10, receivedQuantity: 8, damagedQuantity: 2, remainingPutAwayQuantity: 6, remainingDamageIsolationQuantity: 2, rejectedQuantity: 2, keptAtReceivingQuantity: 0 };
  const events = [];
  const render = (allowed, busy) => ReceiptItemCard({ item, canPutAway: allowed, canIsolate: allowed, busy, onPutAway: id => events.push(['put', id]), onIsolate: id => events.push(['isolate', id]) });
  const tree = render(false, false), nodes = walk(tree);
  assert.ok(nodes.some(node => node.type === 'AlertBanner' && node.props.title.includes('2\u00a0Cái')));
  const disclosure = nodes.find(node => node.type === 'WorkDetails');
  assert.equal(walk(disclosure).some(node => node.type === 'AlertBanner'), false);
  assert.equal(nodes.some(node => node.type === 'Button'), false);
  const enabled = walk(render(true, false)).filter(node => node.type === 'Button'); enabled.forEach(node => node.props.onPress());
  assert.deepEqual(events, [['put', 'item'], ['isolate', 'item']]);
  assert.ok(walk(render(true, true)).filter(node => node.type === 'Button').every(node => node.props.disabled));
});

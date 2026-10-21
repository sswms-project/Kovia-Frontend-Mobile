import { useRouter } from 'expo-router';
import { ScanLine, SearchX } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FilterChips, type FilterOption } from '@/components/ui/filter-chips';
import { LoadingState } from '@/components/ui/loading-state';
import { SearchField } from '@/components/ui/search-field';
import { StatusPill } from '@/components/ui/status-pill';
import { P } from '@/config/permission-codes';
import { FontFamily, MaxContentWidth } from '@/constants/theme';
import { useCan } from '@/features/auth/hooks/use-can';
import { ScannerScreen } from '@/features/scanner/screens/scanner-screen';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDisplayDateTime } from '@/lib/date-format';

import type { RecordCountBody } from '../cycle-count.api';
import {
  STATUS_LABEL,
  STATUS_TONE,
  getItemState,
  isItemEditable,
  matchesProductCode,
  matchesSearch,
  matchesSlotCode,
} from '../cycle-count.labels';
import { parseQuantity, type CountFormValues, type CycleCountItem } from '../cycle-count.schema';
import { CountEditorModal } from '../components/count-editor-modal';
import { CountItemCard } from '../components/count-item-card';
import {
  useCycleCountActionsQuery,
  useCycleCountMutations,
  useCycleCountQuery,
} from '../hooks/use-cycle-count';
import { useDamagePhotos } from '../hooks/use-damage-photos';

type ItemFilter = 'pending' | 'counted';

const FILTER_OPTIONS: readonly FilterOption<ItemFilter>[] = [
  { value: 'pending', label: 'Chưa đếm' },
  { value: 'counted', label: 'Đã đếm' },
];

interface EditingTarget {
  readonly item: CycleCountItem;
  readonly method: 'Manual' | 'Scanned';
  readonly barcode: string | null;
}

interface CycleCountScreenProps {
  readonly id: string;
}

export function CycleCountScreen({ id }: CycleCountScreenProps) {
  const router = useRouter();
  const theme = useTheme();
  const canView = useCan(P.CYCLE_COUNTS_VIEW);
  const canRecord = useCan(P.CYCLE_COUNTS_RECORD);
  const countQuery = useCycleCountQuery(id);
  const actionsQuery = useCycleCountActionsQuery(id);
  const { start, submit, record } = useCycleCountMutations(id);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ItemFilter | null>(null);
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const photos = useDamagePhotos(countQuery.data?.warehouseId, editing?.item.damageEvidence?.length ?? 0);

  const count = countQuery.data;
  const actions = actionsQuery.data?.allowedActions ?? [];
  const canRecordNow = canRecord && actions.includes('Record');
  const sortedItems = useMemo(
    () =>
      [...(count?.items ?? [])].sort((a, b) =>
        a.slotCode.localeCompare(b.slotCode, 'vi', { numeric: true }),
      ),
    [count?.items],
  );
  const visibleItems = useMemo(() => {
    if (!count) return [];
    return sortedItems.filter((item) => {
      if (!matchesSearch(item, search)) return false;
      const state = getItemState(item, count);
      if (filter === 'pending') return state !== 'counted';
      if (filter === 'counted') return state === 'counted';
      return true;
    });
  }, [count, sortedItems, search, filter]);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/tasks');
  }

  function openEditor(item: CycleCountItem, method: 'Manual' | 'Scanned' = 'Manual', barcode: string | null = null) {
    photos.reset();
    setSaveError(null);
    setEditing({ item, method, barcode });
  }

  async function handleSave(values: CountFormValues) {
    if (!editing || record.isPending) return;
    const damaged = values.damagedQuantity === '' ? 0 : parseQuantity(values.damagedQuantity);
    const body: RecordCountBody = {
      countedQuantity: parseQuantity(values.countedQuantity),
      note: values.note || null,
      countedDamagedQuantity: damaged > 0 ? damaged : null,
      countMethod: editing.method,
      scannedBarcode: editing.method === 'Scanned' ? editing.barcode : null,
      damageReason: damaged > 0 ? values.damageReason : null,
      // Photos already saved on the line stay attached, so only new uploads are sent.
      damageEvidenceIds: damaged > 0 ? photos.photos.map((photo) => photo.id) : [],
    };
    try {
      await record.mutateAsync({ itemId: editing.item.id, body });
      toast.success('Đã lưu số lượng.');
      setEditing(null);
    } catch (error) {
      setSaveError(getApiErrorMessage(error, 'Không lưu được số lượng. Vui lòng thử lại.'));
    }
  }

  async function handleStart() {
    try {
      await start.mutateAsync();
      toast.success('Đã bắt đầu kiểm kê.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không bắt đầu được kiểm kê.'));
    }
  }

  function handleSubmit() {
    Alert.alert(
      'Gửi kết quả kiểm kê?',
      'Sau khi gửi bạn không thể sửa số lượng. Quản lý sẽ xem xét kết quả.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gửi kết quả',
          onPress: () => {
            submit
              .mutateAsync()
              .then(() => toast.success('Đã gửi kết quả kiểm kê.'))
              .catch((error: unknown) => toast.error(getApiErrorMessage(error, 'Không gửi được kết quả.')));
          },
        },
      ],
    );
  }

  /** A product code opens its line; a shelf code narrows the list to that shelf. */
  function handleScan(code: string): boolean {
    if (!count) return false;
    const products = sortedItems.filter(
      (item) => matchesProductCode(item, code) && isItemEditable(item, count, canRecordNow),
    );
    if (products.length === 1 && products[0]) {
      setIsScanOpen(false);
      openEditor(products[0], 'Scanned', code);
      return true;
    }
    if (products.length > 1) {
      setIsScanOpen(false);
      setSearch(code);
      return true;
    }
    const slotMatch = sortedItems.find((item) => matchesSlotCode(item, code));
    if (slotMatch) {
      setIsScanOpen(false);
      setSearch(slotMatch.slotCode);
      return true;
    }
    return false;
  }

  if (!canView) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          <AlertBanner title="Bạn chưa được cấp quyền xem phiếu kiểm kê." />
          <Button label="Quay lại" variant="outline" onPress={goBack} />
        </View>
      </SafeAreaView>
    );
  }
  if (countQuery.isPending) return <LoadingState fullScreen message="Đang tải phiếu kiểm kê…" />;
  if (countQuery.isError || !count) {
    return <ErrorState fullScreen error={countQuery.error} onRetry={() => void countQuery.refetch()} />;
  }

  const countedLines = count.items.filter((item) => item.countedQuantity != null).length;
  const isNotYetScheduled = actionsQuery.data?.denialReasonCode === 'NOT_YET_SCHEDULED';
  const header = (
    <View style={styles.header}>
      <Button label="Về công việc của tôi" variant="ghost" onPress={goBack} />
      <Text accessibilityRole="header" style={[styles.code, { color: theme.text }]}>
        {count.code}
      </Text>
      <View style={styles.row}>
        <StatusPill label={STATUS_LABEL[count.status] ?? count.status} tone={STATUS_TONE[count.status] ?? 'neutral'} />
        {count.priority === 'Urgent' ? <StatusPill label="Khẩn" tone="danger" /> : null}
        {count.isBlindCount ? <StatusPill label="Kiểm kê mù" tone="neutral" /> : null}
      </View>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {count.warehouseName}
        {count.zoneName ? ` · ${count.zoneName}` : ''} · Đã đếm {countedLines}/{count.items.length} dòng
      </Text>
      {count.purpose ? <Text style={[styles.meta, { color: theme.textSecondary }]}>{count.purpose}</Text> : null}

      {isNotYetScheduled && count.scheduledDate ? (
        <AlertBanner
          title="Chưa đến giờ kiểm kê"
          description={`Có thể bắt đầu từ ${formatDisplayDateTime(new Date(count.scheduledDate))}.`}
        />
      ) : null}
      {count.status === 'Recount' ? (
        <AlertBanner title="Quản lý yêu cầu đếm lại" description="Chỉ những dòng được đánh dấu cần đếm lại mới sửa được." />
      ) : null}
      {count.isBlindCount && (count.status === 'Counting' || count.status === 'Recount') ? (
        <AlertBanner title="Kiểm kê mù" description="Số lượng sổ sách được ẩn cho tới khi bạn gửi kết quả." />
      ) : null}
      {count.status === 'Submitted' || count.status === 'Completed' || count.status === 'Cancelled' ? (
        <AlertBanner title="Phiếu đã khóa, chỉ xem." />
      ) : null}

      {actions.includes('Start') ? (
        <Button label="Bắt đầu kiểm kê" loading={start.isPending} onPress={() => void handleStart()} />
      ) : null}
      {actions.includes('Scan') && canRecordNow ? (
        <Button
          label="Quét mã sản phẩm"
          variant="outline"
          renderIcon={(color) => <ScanLine size={18} color={color} />}
          onPress={() => setIsScanOpen(true)}
        />
      ) : null}

      <SearchField
        value={search}
        onChangeText={setSearch}
        placeholder="Tìm sản phẩm, SKU, vị trí hoặc lô"
        accessibilityLabel="Tìm dòng kiểm kê"
      />
      <FilterChips
        accessibilityLabel="Lọc dòng kiểm kê"
        options={FILTER_OPTIONS}
        value={filter}
        onChange={setFilter}
      />
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CountItemCard
            item={item}
            state={getItemState(item, count)}
            isEditable={isItemEditable(item, count, canRecordNow)}
            isBlind={count.isBlindCount}
            onPress={(target) => openEditor(target)}
          />
        )}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState icon={SearchX} title="Không có dòng phù hợp" description="Thử đổi từ khóa hoặc bỏ bộ lọc." />
        }
        ListFooterComponent={
          actions.includes('Submit') ? (
            <View style={styles.footer}>
              <Button label="Gửi kết quả kiểm kê" loading={submit.isPending} onPress={handleSubmit} />
            </View>
          ) : null
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshing={countQuery.isRefetching}
        onRefresh={() => {
          void countQuery.refetch();
          void actionsQuery.refetch();
        }}
      />

      <CountEditorModal
        item={editing?.item ?? null}
        isBlind={count.isBlindCount}
        isScanned={editing?.method === 'Scanned'}
        isSaving={record.isPending}
        errorMessage={saveError}
        photoState={{ ...photos, add: () => void photos.add() }}
        onSave={(values) => void handleSave(values)}
        onClose={() => setEditing(null)}
      />

      <Modal visible={isScanOpen} animationType="slide" onRequestClose={() => setIsScanOpen(false)}>
        <ScannerScreen title="Quét mã sản phẩm" onScan={handleScan} onClose={() => setIsScanOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 0 },
  header: { gap: 12, marginBottom: 16 },
  code: { fontFamily: FontFamily.mono, fontSize: 22, lineHeight: 30 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  meta: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  separator: { height: 12 },
  footer: { marginTop: 20 },
});

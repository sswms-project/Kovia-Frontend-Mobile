import { FlashList } from '@shopify/flash-list';
import { Lock } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SelectionField } from '@/components/ui/selection-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isApiErrorResponse } from '@/lib/api-error';

import { RESERVATION_STATUS_FILTERS } from '../reservations.labels';
import { reservationStatusSchema } from '../reservations.schema';
import type { InventoryReservation, ReservationStatus } from '../reservations.types';
import { ReservationCard } from './reservation-card';

interface ReservationsListViewProps {
  readonly workspaceControl: ReactNode;
  readonly statusFilter: ReservationStatus | null;
  readonly onStatusChange: (value: ReservationStatus | null) => void;
  readonly reservations: readonly InventoryReservation[];
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly isRefreshing: boolean;
  readonly isFetchingNextPage: boolean;
  readonly onRefresh: () => void;
  readonly onEndReached: () => void;
  readonly onRetry: () => void;
}

const isFatal = (error: unknown) => isApiErrorResponse(error) && [401, 403, 404].includes(error.statusCode);

export function ReservationsListView({
  workspaceControl, statusFilter, onStatusChange, reservations, isLoading, error,
  isRefreshing, isFetchingNextPage, onRefresh, onEndReached, onRetry,
}: ReservationsListViewProps) {
  const theme = useTheme();

  function renderBody() {
    if (isLoading) return <LoadingState message="Đang tải danh sách giữ chỗ…" />;
    if (error && (reservations.length === 0 || isFatal(error))) return <ErrorState error={error} onRetry={onRetry} />;
    if (reservations.length === 0) {
      return <EmptyState icon={Lock} title="Chưa có giữ chỗ"
        description={statusFilter ? 'Thử bỏ lọc trạng thái.' : 'Hàng được giữ cho phiếu xuất, điều chuyển sẽ hiện tại đây.'} />;
    }
    return (
      <FlashList data={reservations} keyExtractor={(reservation) => reservation.id}
        renderItem={({ item }) => <ReservationCard reservation={item} />}
        ItemSeparatorComponent={Separator} contentContainerStyle={styles.listContent}
        refreshing={isRefreshing} onRefresh={onRefresh} onEndReached={onEndReached} onEndReachedThreshold={0.5}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={theme.primary} /> : null} />
    );
  }

  return (
    <SafeAreaView edges={[]} style={[styles.root, { backgroundColor: theme.background }]}>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Số lượng đã được giữ cho các phiếu xuất, điều chuyển và trả hàng.
      </Text>
      <View style={styles.control}>
        {workspaceControl}
        <SelectionField label="Trạng thái" value={statusFilter ?? ''}
          options={[{ value: '', label: 'Tất cả trạng thái' }, ...RESERVATION_STATUS_FILTERS]}
          onChange={(value) => onStatusChange(value ? reservationStatusSchema.parse(value) : null)} />
      </View>
      {!!error && reservations.length > 0 && !isFatal(error) &&
        <AlertBanner title="Đang hiển thị dữ liệu cũ. Chưa thể tải dữ liệu mới.">
          <Button label="Tải lại" variant="outline" onPress={onRetry} loading={isRefreshing} />
        </AlertBanner>}
      <View style={styles.body}>{renderBody()}</View>
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12, paddingTop: 8 },
  description: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19, paddingHorizontal: 20 },
  control: { paddingHorizontal: 20, gap: 12 },
  body: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  separator: { height: 10 },
  footer: { paddingVertical: 16 },
});

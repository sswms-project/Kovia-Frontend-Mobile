import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PermissionCodes } from '@/config/permission-codes';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ActionButton, Feedback } from '@/features/auth/components/auth-form';
import type { UserProfile } from '@/features/auth/auth.types';
import { useTheme } from '@/hooks/use-theme';

import { hasWarehousePermission, type AssignedWarehouse } from '../warehouse-access';

interface WarehousePickerProps {
  profile?: UserProfile;
  warehouses: AssignedWarehouse[];
  selected: AssignedWarehouse | null;
  validated: boolean;
  loading: boolean;
  error: Error | null;
  notice: string | null;
  compatible: boolean;
  onSelect: (id: string) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  onProfile: () => void;
}

const WarehouseRow = memo(function WarehouseRow({ warehouse, selected, disabled, onSelect }: {
  warehouse: AssignedWarehouse; selected: boolean; disabled: boolean; onSelect: (id: string) => void;
}) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={`${warehouse.warehouseCode}, ${warehouse.warehouseName}${selected ? ', đang làm việc' : ''}`}
      disabled={disabled} onPress={() => onSelect(warehouse.id)}
      style={[styles.row, { borderColor: selected ? colors.text : colors.backgroundSelected,
        backgroundColor: selected ? colors.backgroundSelected : colors.backgroundElement }]}>
      <View style={styles.rowText}>
        <Text style={[styles.code, { color: colors.textSecondary }]}>{warehouse.warehouseCode}</Text>
        <Text style={[styles.name, { color: colors.text }]}>{warehouse.warehouseName}</Text>
        {selected && <Text style={{ color: colors.textSecondary }}>Đang làm việc</Text>}
      </View>
      <Text accessibilityElementsHidden style={[styles.indicator, { color: colors.text }]}>{selected ? '●' : '○'}</Text>
    </Pressable>
  );
});

export function WarehousePicker({ profile, warehouses, selected, validated, loading, error, notice,
  compatible, onSelect, onRefresh, onProfile }: WarehousePickerProps) {
  const colors = useTheme();
  const [search, setSearch] = useState('');
  const [switching, setSwitching] = useState(false);
  const filtered = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    return warehouses.filter((warehouse) =>
      `${warehouse.warehouseCode} ${warehouse.warehouseName}`.toLocaleLowerCase('vi').includes(keyword));
  }, [search, warehouses]);
  const choose = useCallback((id: string) => {
    setSwitching(true);
    void onSelect(id).finally(() => setSwitching(false));
  }, [onSelect]);
  const renderItem = useCallback(({ item }: { item: AssignedWarehouse }) => (
    <WarehouseRow warehouse={item} selected={selected?.id === item.id}
      disabled={!validated || loading || switching} onSelect={choose} />
  ), [selected?.id, validated, loading, switching, choose]);
  const emptyMessage = !validated ? 'Xác minh quyền truy cập trước khi chọn kho.' :
    warehouses.length === 0 ? 'Bạn chưa được giao kho đang hoạt động. Liên hệ người quản lý để được phân công.' :
      'Không tìm thấy kho phù hợp. Thử mã hoặc tên khác.';

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList data={validated ? filtered : []} keyExtractor={(warehouse) => warehouse.id}
        renderItem={renderItem} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>KOVIA · KHÔNG GIAN LÀM VIỆC</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Kho làm việc</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {selected ? `Đang làm việc tại ${selected.warehouseName}.` : 'Chọn kho được phép truy cập để bắt đầu làm việc.'}
            </Text>
            <Feedback error={error} message={notice ?? undefined} />
            {!compatible && profile && <Feedback message="Backend chưa cung cấp trạng thái kho hợp lệ. Cần cập nhật API trước khi chọn kho." />}
            {profile && profile.status !== 'Active' && <Feedback message="Tài khoản chưa hoạt động. Liên hệ người quản lý." />}
            <View style={styles.actions}>
              <ActionButton label="Kiểm tra lại quyền" busy={loading} onPress={() => { void onRefresh(); }} secondary />
              <ActionButton label="Hồ sơ và đăng xuất" onPress={onProfile} secondary />
            </View>
            {selected && <View style={[styles.summary, { backgroundColor: colors.backgroundElement }]}>
              <Text style={[styles.name, { color: colors.text }]}>Quyền tại kho đang chọn</Text>
              <Text style={{ color: colors.textSecondary }}>Công việc của tôi: {hasWarehousePermission(profile, true, PermissionCodes.viewOwnTasks) ? 'Được xem' : 'Chưa được cấp quyền'}</Text>
              <Text style={{ color: colors.textSecondary }}>Tra cứu tồn kho: {hasWarehousePermission(profile, true, PermissionCodes.viewInventory) ? 'Được xem' : 'Chưa được cấp quyền'}</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>Các màn hình nghiệp vụ sẽ được triển khai ở bước tiếp theo.</Text>
            </View>}
            <Text style={[styles.name, { color: colors.text }]}>Kho được phép truy cập ({warehouses.length})</Text>
            <TextInput value={search} onChangeText={setSearch} accessibilityLabel="Tìm kho theo mã hoặc tên"
              placeholder="Tìm mã hoặc tên kho" placeholderTextColor={colors.textSecondary}
              autoCapitalize="none" autoCorrect={false} returnKeyType="search"
              style={[styles.search, { color: colors.text, borderColor: colors.backgroundSelected }]} />
            {loading && <Feedback message="Đang tải kho và quyền truy cập…" />}
          </View>
        }
        ListEmptyComponent={<Text style={[styles.description, { color: colors.textSecondary }]}>{emptyMessage}</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two },
  header: { gap: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.two },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 30, lineHeight: 38, fontWeight: '700' },
  description: { fontSize: 15, lineHeight: 23 },
  actions: { gap: Spacing.two },
  summary: { padding: Spacing.three, gap: Spacing.two, borderRadius: Spacing.three },
  search: { minHeight: 48, paddingHorizontal: Spacing.three, borderWidth: 1, borderRadius: Spacing.two, fontSize: 16 },
  row: { minHeight: 80, borderRadius: Spacing.three, padding: Spacing.three, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowText: { flex: 1, gap: Spacing.one },
  code: { fontSize: 12, fontWeight: '600' },
  name: { fontSize: 17, fontWeight: '600', lineHeight: 25 },
  indicator: { fontSize: 25 },
});

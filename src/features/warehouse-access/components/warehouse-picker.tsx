import { Check, RefreshCw, Search, UserRound, Warehouse } from 'lucide-react-native';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PermissionCodes } from '@/config/permission-codes';
import { FontFamily, MaxContentWidth, Radius } from '@/constants/theme';
import { Feedback } from '@/features/auth/components/auth-form';
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
      style={({ pressed }) => [styles.row, {
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primaryContainer : colors.card,
        opacity: disabled && !selected ? 0.6 : pressed ? 0.85 : 1,
      }]}>
      <View style={[styles.rowIcon, { backgroundColor: selected ? colors.primary : colors.primaryContainer }]}>
        <Warehouse size={20} color={selected ? colors.onPrimary : colors.onPrimaryContainer} />
      </View>
      <View style={styles.rowText}>
        <View style={[styles.codeBadge, { backgroundColor: selected ? colors.card : colors.primaryContainer }]}>
          <Text style={[styles.code, { color: colors.onPrimaryContainer }]}>{warehouse.warehouseCode}</Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{warehouse.warehouseName}</Text>
        {selected && <Text style={[styles.active, { color: colors.primary }]}>Đang làm việc</Text>}
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[styles.check, selected
          ? { backgroundColor: colors.primary, borderColor: colors.primary }
          : { borderColor: colors.border }]}>
        {selected && <Check size={14} color={colors.onPrimary} />}
      </View>
    </Pressable>
  );
});

function PermissionChip({ label, allowed }: { label: string; allowed: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.permRow}>
      <Text style={[styles.permLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.chip, { backgroundColor: allowed ? colors.primaryContainer : colors.errorContainer }]}>
        <Text style={[styles.chipText, { color: allowed ? colors.onPrimaryContainer : colors.error }]}>
          {allowed ? 'Được xem' : 'Chưa được cấp quyền'}
        </Text>
      </View>
    </View>
  );
}

export function WarehousePicker({ profile, warehouses, selected, validated, loading, error, notice,
  compatible, onSelect, onRefresh, onProfile }: WarehousePickerProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
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
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList data={validated ? filtered : []} keyExtractor={(warehouse) => warehouse.id}
        renderItem={renderItem} keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 48 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.brand}>
              <View style={[styles.logo, { backgroundColor: colors.primary }]}>
                <Warehouse size={18} color={colors.onPrimary} />
              </View>
              <Text style={[styles.brandText, { color: colors.text }]}>KOVIA WMS</Text>
            </View>
            <View style={styles.titleBlock}>
              <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Kho làm việc</Text>
              <Text style={[styles.description, { color: colors.textSecondary }]}>
                {selected ? `Đang làm việc tại ${selected.warehouseName}.` : 'Chọn kho được giao để bắt đầu ca làm việc.'}
              </Text>
            </View>
            <Feedback error={error} message={notice ?? undefined} />
            {!compatible && profile && <Feedback message="Backend chưa cung cấp trạng thái kho hợp lệ. Cần cập nhật API trước khi chọn kho." />}
            {profile && profile.status !== 'Active' && <Feedback message="Tài khoản chưa hoạt động. Liên hệ người quản lý." />}
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Kiểm tra lại quyền"
                accessibilityState={{ busy: loading }} onPress={() => { void onRefresh(); }}
                style={({ pressed }) => [styles.action, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
                <RefreshCw size={16} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>{loading ? 'Đang kiểm tra…' : 'Kiểm tra lại quyền'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Hồ sơ và đăng xuất" onPress={onProfile}
                style={({ pressed }) => [styles.action, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
                <UserRound size={16} color={colors.text} />
                <Text style={[styles.actionText, { color: colors.text }]}>Hồ sơ</Text>
              </Pressable>
            </View>
            {selected && <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Quyền tại kho đang chọn</Text>
              <PermissionChip label="Công việc của tôi" allowed={hasWarehousePermission(profile, true, PermissionCodes.viewOwnTasks)} />
              <PermissionChip label="Tra cứu tồn kho" allowed={hasWarehousePermission(profile, true, PermissionCodes.viewInventory)} />
            </View>}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Kho được giao ({warehouses.length})</Text>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Search size={18} color={colors.textSecondary} />
              <TextInput value={search} onChangeText={setSearch} accessibilityLabel="Tìm kho theo mã hoặc tên"
                placeholder="Tìm mã hoặc tên kho" placeholderTextColor={colors.textSecondary}
                autoCapitalize="none" autoCorrect={false} returnKeyType="search"
                style={[styles.search, { color: colors.text }]} />
            </View>
            {loading && <Feedback message="Đang tải kho và quyền truy cập…" />}
          </View>
        }
        ListEmptyComponent={<Text style={[styles.description, { color: colors.textSecondary }]}>{emptyMessage}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: 16, gap: 12 },
  header: { gap: 16, paddingBottom: 4 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 36, height: 36, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 18, fontFamily: FontFamily.bold, letterSpacing: 0.5 },
  titleBlock: { gap: 4 },
  title: { fontSize: 28, lineHeight: 36, fontFamily: FontFamily.bold },
  description: { fontSize: 15, lineHeight: 22, fontFamily: FontFamily.regular },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  actionText: { fontSize: 14, fontFamily: FontFamily.semibold },
  summary: { padding: 16, gap: 10, borderRadius: 16, borderWidth: 1 },
  summaryTitle: { fontSize: 15, fontFamily: FontFamily.bold },
  permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  permLabel: { fontSize: 14, fontFamily: FontFamily.medium },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 12, fontFamily: FontFamily.semibold },
  sectionTitle: { fontSize: 16, fontFamily: FontFamily.bold },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12 },
  search: { flex: 1, minHeight: 48, fontSize: 16, fontFamily: FontFamily.regular },
  row: { minHeight: 80, borderRadius: 16, padding: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 4, alignItems: 'flex-start' },
  codeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  code: { fontSize: 12, fontFamily: FontFamily.semibold },
  name: { fontSize: 16, fontFamily: FontFamily.semibold, lineHeight: 22 },
  active: { fontSize: 12, fontFamily: FontFamily.semibold },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});

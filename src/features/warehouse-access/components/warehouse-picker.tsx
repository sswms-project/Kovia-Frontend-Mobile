import { Warehouse } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KoviaLogo } from '@/components/kovia-logo';
import { isFieldWorkspace } from '@/config/mobile-workspace';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { SelectionField } from '@/components/ui/selection-field';
import { FontFamily, MaxContentWidth, Radius } from '@/constants/theme';
import type { UserProfile } from '@/features/auth/auth.types';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import type { AssignedWarehouse } from '../warehouse-access';

interface WarehousePickerProps {
  readonly profile?: UserProfile;
  readonly warehouses: AssignedWarehouse[];
  readonly selected: AssignedWarehouse | null;
  readonly validated: boolean;
  readonly loading: boolean;
  readonly error: Error | null;
  readonly notice: string | null;
  readonly compatible: boolean;
  readonly onSelect: (id: string) => Promise<boolean>;
  readonly onRefresh: () => Promise<void>;
  readonly onProfile: () => void;
}

export function WarehousePicker({ profile, warehouses, selected, validated, loading, error, notice,
  compatible, onSelect, onRefresh, onProfile }: WarehousePickerProps) {
  const theme = useTheme();
  const overview = !!profile && !isFieldWorkspace(profile.role);
  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <KoviaLogo />
      <View style={[styles.hero, { backgroundColor: theme.primary }]}>
        <View style={[styles.icon, { backgroundColor: theme.onPrimary }]}><Warehouse size={28} color={theme.primary} /></View>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.onPrimary }]}>{overview ? 'Chọn kho theo dõi' : 'Bắt đầu ca làm việc'}</Text>
        <Text style={[styles.body, { color: theme.onPrimary }]}>{overview ? 'Theo dõi tồn kho, tiến độ và các chứng từ trong phạm vi được phép truy cập.' : 'Chọn kho để xem công việc, tra cứu hàng và ghi nhận thao tác tại hiện trường.'}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {!!profile && <Text style={[styles.name, { color: theme.text }]}>Xin chào, {profile.fullName}</Text>}
        <SelectionField label={overview ? 'Kho theo dõi' : 'Kho làm việc'} value={selected?.id ?? ''}
          placeholder={loading ? 'Đang tải danh sách kho…' : overview ? 'Chọn kho được phép truy cập' : 'Chọn kho được phân công'}
          options={warehouses.map((warehouse) => ({ value: warehouse.id, label: warehouse.warehouseName, description: warehouse.warehouseCode }))}
          disabled={!validated || loading} onChange={(id) => { void onSelect(id); }} />
        {validated && warehouses.length === 0 && <AlertBanner title={overview ? 'Chưa có kho đang hoạt động trong phạm vi truy cập.' : 'Bạn chưa được phân công kho đang hoạt động.'} description={overview ? 'Kiểm tra trạng thái kho và quyền truy cập trên web.' : 'Liên hệ quản lý để được giao kho.'} />}
        {!!error && <AlertBanner variant="destructive" title="Chưa tải được quyền truy cập" description={getApiErrorMessage(error)} />}
        {!!notice && <AlertBanner title={notice} />}
        {!compatible && !!profile && <AlertBanner title="Thông tin kho chưa hợp lệ. Vui lòng liên hệ quản lý." />}
        {!!profile && profile.status !== 'Active' && <AlertBanner title="Tài khoản chưa hoạt động. Vui lòng liên hệ quản lý." />}
        <Button label="Tải lại danh sách kho" variant="outline" loading={loading} onPress={() => { void onRefresh(); }} />
        <Text style={[styles.hint, { color: theme.textSecondary }]}>Danh sách chỉ gồm những kho bạn được phép truy cập.</Text>
      </View>
      <Button label="Tài khoản của tôi" variant="ghost" onPress={onProfile} />
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 20, paddingBottom: 40, gap: 20, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  hero: { padding: 24, borderRadius: Radius.lg, gap: 16 }, icon: { width: 56, height: 56, borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: FontFamily.bold, fontSize: 26, lineHeight: 34 }, body: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 23 },
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: 20, gap: 16 }, name: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 26 },
  hint: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 20 },
});

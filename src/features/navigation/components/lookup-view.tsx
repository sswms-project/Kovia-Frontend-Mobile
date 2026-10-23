import {
  ChevronRight,
  FileBarChart,
  FolderTree,
  History,
  ClipboardList,
  Package,
  PackageMinus,
  PackagePlus,
  Ruler,
  Scale,
  Search,
  ShieldAlert,
  Truck,
  Undo2,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';

import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { AlertBanner } from '@/components/ui/alert-banner';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface LookupEntry {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly onPress: () => void;
  readonly group?: string;
}

// Each lookup screen registers its icon here; unknown keys fall back to the generic search icon.
const ENTRY_ICONS: Record<string, LucideIcon> = {
  'warehouse-monitor': ClipboardList,
  discrepancies: ClipboardList,
  products: Package,
  suppliers: Truck,
  units: Ruler,
  categories: FolderTree,
  warehouses: Warehouse,
  'inbound-requests': PackagePlus,
  'stock-issue-requests': PackageMinus,
  'stock-recipients': Users,
  'goods-returns': Undo2,
  'stock-adjustments': Scale,
  'damage-cases': ShieldAlert,
  reports: FileBarChart,
  'audit-logs': History,
};

interface LookupViewProps {
  readonly entries: readonly LookupEntry[];
  readonly owner?: boolean;
  readonly title?: string;
  readonly refreshing?: boolean;
  readonly onRefresh?: () => void;
  readonly refreshFailed?: boolean;
}

export function LookupView({ entries, owner = false, title, refreshing = false, onRefresh, refreshFailed = false }: LookupViewProps) {
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <AppHeader title={title ?? (owner ? 'Quản lý' : 'Tra cứu & báo cáo')} />
      {onRefresh && <View style={styles.header}><Button label="Làm mới" variant="ghost" loading={refreshing} onPress={onRefresh} /></View>}
      {refreshFailed && <AlertBanner variant="destructive" title="Chưa thể xác minh quyền. Vui lòng tải lại." />}

      {entries.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Chưa có mục tra cứu"
          description="Tài khoản của bạn chưa được cấp quyền xem danh mục nào."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {entries.map((entry, index) => {
            const Icon = ENTRY_ICONS[entry.key] ?? Search;
            return (
              <View key={entry.key} style={styles.entry}>
              {entry.group && entry.group !== entries[index - 1]?.group && <Text accessibilityRole="header" style={[styles.group, { color: theme.textSecondary }]}>{entry.group}</Text>}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${entry.title}. ${entry.description}`}
                onPress={entry.onPress}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.iconBox, { backgroundColor: theme.secondaryContainer }]}>
                  <Icon size={22} color={theme.primary} />
                </View>
                <View style={styles.text}>
                  <Text style={[styles.entryTitle, { color: theme.text }]}>{entry.title}</Text>
                  <Text style={[styles.description, { color: theme.textSecondary }]}>{entry.description}</Text>
                </View>
                <ChevronRight size={20} color={theme.textSecondary} />
              </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12, paddingTop: 12 },
  header: { paddingHorizontal: 20, paddingTop: 4, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 26, lineHeight: 32 },
  list: { gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  entry: { gap: 10 },
  group: { fontFamily: FontFamily.semibold, fontSize: 13, paddingTop: 12 },
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: Radius.xl,
  },
  pressed: { opacity: 0.85 },
  iconBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg },
  text: { flex: 1, gap: 2 },
  entryTitle: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 22 },
  description: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
});

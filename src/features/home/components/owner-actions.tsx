import { router } from 'expo-router';
import { ChevronRight, ClipboardCheck, ClipboardList, History, Layers, FolderOpen } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { P } from '@/config/permission-codes';
import { FontFamily } from '@/constants/theme';
import type { UserProfile } from '@/features/auth/auth.types';
import { useTheme } from '@/hooks/use-theme';

export function OwnerActions({ profile, ready }: { readonly profile: UserProfile; readonly ready: boolean }) {
  const theme = useTheme();
  const actions = [
    { title: 'Giám sát công việc', hint: 'Xem tiến độ, nhân viên phụ trách và lịch sử toàn kho', icon: ClipboardList,
      allowed: profile.permissions.includes(P.WAREHOUSE_TASKS_VIEW_ALL), href: '/catalog/warehouse-monitor' as const },
    { title: 'Duyệt hàng nhận', hint: 'Kiểm tra hàng đạt và quyết định nơi lưu', icon: ClipboardCheck,
      allowed: profile.permissions.includes(P.GOODS_RECEIPTS_VIEW) && profile.permissions.includes(P.GOODS_RECEIPTS_APPROVE), href: '/receiving-review' as const },
    { title: 'Phân bổ thông minh', hint: 'Ưu tiên FEFO, lấy trực tiếp tại khu nhận', icon: Layers,
      allowed: profile.permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW) && profile.permissions.includes(P.STOCK_ISSUE_REQUESTS_ASSIGN_PICKER), href: '/smart-allocation' as const },
    { title: 'Chứng từ & báo cáo', hint: 'Theo dõi nhập, xuất và dữ liệu kho', icon: FolderOpen, allowed: true, href: '/catalog' as const },
    { title: 'Nhật ký hoạt động', hint: 'Tra cứu người thực hiện và lịch sử thay đổi', icon: History,
      allowed: profile.permissions.includes(P.AUDIT_LOGS_VIEW), href: '/catalog/audit-logs' as const },
  ].filter((action) => action.allowed);
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>Điều hành kho</Text>
    <View style={[styles.group, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {actions.map((action, index) => <Pressable key={action.href} accessibilityRole="button" disabled={!ready}
        accessibilityState={{ disabled: !ready }} onPress={() => router.push(action.href)}
        style={({ pressed }) => [styles.row, index > 0 && styles.divider, { borderColor: theme.border }, (pressed || !ready) && styles.dim]}>
        <View style={[styles.icon, { backgroundColor: theme.muted }]}><action.icon size={22} color={theme.primary} /></View>
        <View style={styles.copy}><Text style={[styles.title, { color: theme.text }]}>{action.title}</Text>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>{action.hint}</Text></View>
        <ChevronRight size={18} color={theme.textSecondary} />
      </Pressable>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 12 }, heading: { fontFamily: FontFamily.bold, fontSize: 17 },
  group: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, minHeight: 80 },
  divider: { borderTopWidth: 1 }, icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 }, title: { fontFamily: FontFamily.semibold, fontSize: 15 },
  hint: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19 }, dim: { opacity: 0.6 },
});

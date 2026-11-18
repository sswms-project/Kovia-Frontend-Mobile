import { Info, LockKeyhole } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { CycleCount } from '../cycle-count.schema';

export function CycleCountModeNotice({ document }: { readonly document: CycleCount }) {
  const theme = useTheme();
  const blind = document.isBlindCount && ['Scheduled', 'Counting', 'Recount'].includes(document.status);
  const Icon = blind ? LockKeyhole : Info;
  return <View accessible style={[styles.root, { backgroundColor: theme.backgroundElement }]}>
    <Icon size={18} color={theme.primary} style={styles.icon} />
    <View style={styles.body}>
      <Text style={[styles.title, { color: theme.text }]}>{blind ? 'Kiểm kê mù · Tồn sổ sách được ẩn' : 'Kiểm kê thực tế'}</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Ghi số thực đếm tại đúng vị trí/lô. Số lượng tồn không thay đổi khi lưu/gửi/hoàn tất kiểm kê; chênh lệch phải theo phiếu điều chỉnh được duyệt riêng.
      </Text>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: Radius.lg },
  icon: { marginTop: 1 },
  body: { flex: 1, gap: 2 },
  title: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  description: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
});

import { Warehouse } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { STATUS_LABELS, STATUS_TONES, isUrgentOpen } from '../cycle-count.labels';
import type { CycleCount } from '../cycle-count.schema';

interface Props { readonly document: CycleCount }
export function CycleCountHeader({ document }: Props) {
  const theme = useTheme();
  const total = document.items.length;
  const counted = document.items.filter(item => item.countedQuantity !== null).length;
  const percent = total ? Math.round(counted / total * 100) : 0;
  return <View style={[styles.root, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={styles.top}>
      <View style={styles.grow}>
        <Text importantForAccessibility="no" accessibilityElementsHidden style={[styles.kicker, { color: theme.textSecondary }]}>Phiếu kiểm kê</Text>
        <Text accessibilityRole="header" accessibilityLabel={`Phiếu kiểm kê ${document.code}`} numberOfLines={1}
          style={[styles.code, { color: theme.text }]}>{document.code}</Text>
      </View>
      <View style={styles.pills}>
        <StatusPill label={STATUS_LABELS[document.status]} tone={STATUS_TONES[document.status]} />
        {isUrgentOpen(document) && <StatusPill label="Khẩn" tone="danger" />}
      </View>
    </View>
    <View style={styles.meta}>
      <Warehouse size={14} color={theme.textSecondary} style={styles.icon} />
      <Text style={[styles.warehouse, { color: theme.textSecondary }]}>{document.warehouseName}</Text>
    </View>
    <View accessible accessibilityRole="progressbar" accessibilityLabel="Tiến độ ghi đếm"
      accessibilityValue={{ min: 0, max: total, now: counted }} style={styles.progress}>
      <View style={styles.progressRow}>
        <Text style={[styles.caption, { color: theme.textSecondary }]}>Tiến độ ghi đếm</Text>
        <Text style={[styles.progressValue, { color: theme.text }]}>{counted}/{total} dòng · {percent}%</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.fill, { backgroundColor: theme.primary, width: `${percent}%` }]} />
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  root: { gap: 12, padding: 16, borderWidth: 1, borderRadius: Radius.xl },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  kicker: { fontFamily: FontFamily.medium, fontSize: 13, lineHeight: 18 },
  code: { fontFamily: FontFamily.mono, fontSize: 22, lineHeight: 30 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, paddingTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  icon: { marginTop: 3 },
  warehouse: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  progress: { gap: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  caption: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16 },
  progressValue: { fontFamily: FontFamily.semibold, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

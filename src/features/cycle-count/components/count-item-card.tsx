import { ChevronDown, ChevronUp, History, Info, LockKeyhole, MapPin, Package, PencilLine, ScanBarcode, UserRound } from 'lucide-react-native';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { EvidenceLinks } from '@/components/ui/evidence-preview';
import type { EvidenceFile } from '@/hooks/use-evidence-preview';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatCountLocation } from '../cycle-count';
import { QUALITY_LABELS, QUALITY_TONES, formatCount, formatCountDate, formatCountDay, formatCountDifference, getItemState } from '../cycle-count.labels';

import type { CountItem } from '../cycle-count.schema';

interface Props { readonly item: CountItem; readonly recountRound: number; readonly canRecord: boolean; readonly busy: boolean;
  readonly onRecord: (item: CountItem) => void; readonly onOpenEvidence: (file: EvidenceFile) => void }
export const CountItemCard = memo(function CountItemCard({ item, recountRound, canRecord, busy, onRecord, onOpenEvidence }: Props) {
  const theme = useTheme();
  const [historyOpen, setHistoryOpen] = useState(false);
  const state = getItemState(item, recountRound);
  const unit = item.unitName ?? 'Đơn vị cơ sở';
  const damaged = item.countedDamagedQuantity ?? 0;
  const location = formatCountLocation(item);
  const muted = { color: theme.textSecondary };
  const counted = formatCount(item.countedQuantity);
  const damagedText = item.countedQuantity === null ? '—' : formatCount(damaged);
  const hasDetails = !!item.damageEvidence?.length || !!item.damageReason || !!item.note || !!item.countedByName;
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <View style={styles.top}>
      <Text style={[styles.sku, muted]} numberOfLines={1}>{item.productSku}</Text>
      <View style={styles.badges}>
        {item.countMethod === 'Scanned' && <ScanBarcode size={18} color={theme.textSecondary} accessibilityLabel="Ghi đếm bằng quét mã" />}
        <StatusPill label={state.label} tone={state.tone} />
      </View>
    </View>
    <View style={styles.identity}>
      <Text style={[styles.name, { color: theme.text }]}>{item.productName}</Text>
      <View style={styles.meta} accessible accessibilityLabel={`Vị trí ${location}`}>
        <MapPin size={14} color={theme.textSecondary} style={styles.icon} />
        <Text style={[styles.metaText, { color: theme.text }]}>{location}</Text>
      </View>
      <View style={styles.meta}>
        <Package size={14} color={theme.textSecondary} style={styles.icon} />
        <Text style={[styles.metaText, muted]}>
          {item.lotNumber ? <>Lô <Text style={[styles.mono, { color: theme.text }]}>{item.lotNumber}</Text></> : 'Không theo lô'}
          {item.expiryDate ? ` · HSD ${formatCountDay(item.expiryDate)}` : ''}
        </Text>
      </View>
    </View>
    <View style={styles.facts}>
      <View style={styles.fact}><Text style={[styles.caption, muted]}>Chất lượng sổ sách</Text>
        <StatusPill label={QUALITY_LABELS[item.qualityStatus] ?? item.qualityStatus} tone={QUALITY_TONES[item.qualityStatus] ?? 'neutral'} /></View>
      <View style={styles.fact}><Text style={[styles.caption, muted]}>Đơn vị</Text>
        <Text style={[styles.factValue, { color: theme.text }]}>{unit}</Text></View>
    </View>
    <View style={[styles.compare, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.stats}>
        {item.systemQuantity === null
          ? <Stat label="Sổ sách" value="Ẩn" locked accessibilityLabel="Sổ sách ẩn khi kiểm kê mù" />
          : <Stat label="Sổ sách" value={formatCount(item.systemQuantity)} accessibilityLabel={`Sổ sách ${formatCount(item.systemQuantity)} ${unit}`} />}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Stat label="Số đếm" value={counted}
          accessibilityLabel={item.countedQuantity === null ? 'Chưa có số đếm' : `Số đếm ${counted} ${unit}`} />
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <Stat label="Hỏng" value={damagedText} danger={damaged > 0}
          accessibilityLabel={item.countedQuantity === null ? 'Chưa có số hỏng' : `Trong đó hỏng ${damagedText} ${unit}`} />
      </View>
      <View style={[styles.differenceRow, { borderTopColor: theme.border }]}>
        <Text style={[styles.caption, muted]}>Chênh lệch</Text>
        <Text style={[styles.difference, { color: item.difference !== null && item.difference < 0 ? theme.error : theme.text }]}>{formatCountDifference(item.difference)}</Text>
      </View>
    </View>
    {hasDetails && <View style={styles.details}>
      {!!item.damageEvidence?.length && <EvidenceLinks files={item.damageEvidence} onOpen={onOpenEvidence} />}
      {item.damageReason && <Text style={[styles.small, muted]}>Ghi nhận hỏng: {item.damageReason}</Text>}
      {item.note && <Text style={[styles.small, muted]}>Ghi chú: {item.note}</Text>}
      {item.countedByName && <View style={styles.meta}>
        <UserRound size={14} color={theme.textSecondary} style={styles.iconSmall} />
        <Text style={[styles.small, styles.grow, muted]}>{item.countedByName} · {formatCountDate(item.countedAt)}</Text>
      </View>}
    </View>}
    {item.countHistory.length > 0 && <View>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: historyOpen }} accessibilityLabel={`${item.countHistory.length} lần đếm trước`}
        onPress={() => setHistoryOpen(value => !value)} style={styles.trigger}>
        <History size={16} color={theme.primary} />
        <Text style={[styles.triggerText, { color: theme.primary }]}>{item.countHistory.length} lần đếm trước</Text>
        {historyOpen ? <ChevronUp size={16} color={theme.primary} /> : <ChevronDown size={16} color={theme.primary} />}
      </Pressable>
      {historyOpen && <View style={styles.history}>{item.countHistory.map(history => <Text key={history.id} style={[styles.small, muted]}>
        Vòng {history.recountRound}: <Text style={[styles.mono, { color: theme.text }]}>{formatCount(history.countedQuantity)}</Text>
        {history.systemQuantity !== null ? ` / sổ sách ${formatCount(history.systemQuantity)}` : ''}
        {history.countedByName ? ` · ${history.countedByName}` : ''}{history.countMethod === 'Scanned' ? ' · quét mã' : ''} · {history.recountReason}
      </Text>)}</View>}
    </View>}
    {canRecord && <Button label="Nhập số đếm" accessibilityLabel={`Ghi đếm ${item.productSku} tại ${formatCountLocation(item)}`} variant="outline" disabled={busy}
      renderIcon={color => <PencilLine size={16} color={color} />} onPress={() => onRecord(item)} />}
    {item.countedQuantity !== null && <View style={styles.meta}>
      <Info size={14} color={theme.textSecondary} style={styles.iconSmall} />
      <Text style={[styles.small, styles.grow, muted]}>Nếu cần sửa số đếm, liên hệ quản lý yêu cầu đếm lại để giữ lịch sử.</Text>
    </View>}
  </View>;
});

interface StatProps { readonly label: string; readonly value: string; readonly accessibilityLabel: string;
  readonly locked?: boolean; readonly danger?: boolean }
function Stat({ label, value, accessibilityLabel, locked, danger }: StatProps) {
  const theme = useTheme();
  const color = danger ? theme.error : locked ? theme.textSecondary : theme.text;
  return <View style={styles.stat} accessible accessibilityLabel={accessibilityLabel}>
    <Text style={[styles.caption, { color: theme.textSecondary }]} numberOfLines={1}>{label}</Text>
    <View style={styles.statValue}>
      {locked && <LockKeyhole size={14} color={theme.textSecondary} />}
      <Text style={[locked ? styles.locked : styles.value, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderWidth: 1, borderRadius: Radius.xl },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sku: { flex: 1, fontFamily: FontFamily.mono, fontSize: 13, lineHeight: 18 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  identity: { gap: 6 },
  name: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  icon: { marginTop: 3 }, iconSmall: { marginTop: 2 }, grow: { flex: 1 },
  metaText: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  mono: { fontFamily: FontFamily.mono },
  facts: { flexDirection: 'row', gap: 12 },
  fact: { flex: 1, gap: 4, alignItems: 'flex-start' },
  caption: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16 },
  factValue: { fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20 },
  compare: { gap: 12, padding: 12, borderRadius: Radius.lg },
  stats: { flexDirection: 'row', gap: 12 },
  divider: { width: 1, alignSelf: 'stretch' },
  stat: { flex: 1, minWidth: 0, gap: 4 },
  statValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { flexShrink: 1, fontFamily: FontFamily.semibold, fontSize: 20, lineHeight: 28, fontVariant: ['tabular-nums'] },
  locked: { flexShrink: 1, fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 28 },
  differenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  difference: { fontFamily: FontFamily.mono, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  details: { gap: 8 },
  small: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19 },
  trigger: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 }, triggerText: { fontFamily: FontFamily.medium, fontSize: 13 },
  history: { gap: 6, paddingLeft: 24 },
});

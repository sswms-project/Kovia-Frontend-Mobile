import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { PRIORITY_LABELS, formatCountDay, formatCountDate, hasCountResults, isUrgentOpen, withPerson } from '../cycle-count.labels';
import type { CycleCount } from '../cycle-count.schema';

interface FieldProps { readonly label: string; readonly children: ReactNode; readonly wide?: boolean }
function Field({ label, children, wide }: FieldProps) {
  const theme = useTheme();
  return <View style={[styles.field, wide && styles.wide]}>
    <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
    {typeof children === 'string' ? <Text style={[styles.value, { color: theme.text }]}>{children}</Text> : children}
  </View>;
}

interface Props { readonly document: CycleCount }
export function CycleCountInfoSection({ document }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const results = hasCountResults(document);
  const total = document.items.length;
  const counted = document.items.filter(item => item.countedQuantity !== null).length;
  // Blind counts hide the difference from staff, so the server returns null instead of a number.
  const hidden = document.items.some(item => item.countedQuantity !== null && item.difference === null);
  const differences = document.items.filter(item => item.difference !== null && item.difference !== 0).length;
  const assignee = document.assignedToName || 'Chưa phân công';
  const summary = [document.code, assignee, results ? `${counted}/${total} dòng` : null].filter(Boolean).join(' · ');
  return <View style={[styles.root, { borderColor: theme.border, backgroundColor: theme.card }]}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel="Thông tin phiếu"
      onPress={() => setOpen(value => !value)} style={styles.trigger}>
      <View style={styles.grow}>
        <Text style={[styles.title, { color: theme.text }]}>Thông tin phiếu</Text>
        {!open && <Text numberOfLines={1} style={[styles.summary, { color: theme.textSecondary }]}>{summary}</Text>}
      </View>
      {open ? <ChevronUp size={20} color={theme.textSecondary} /> : <ChevronDown size={20} color={theme.textSecondary} />}
    </Pressable>
    {open && <View style={[styles.content, { borderColor: theme.border }]}>
      <View style={styles.grid}>
        <Field wide label="Mục đích">{document.purpose || '—'}</Field>
        <Field label="Kho kiểm kê">{document.warehouseName}</Field>
        <Field label="Phạm vi">{document.zoneName ?? 'Toàn kho'}</Field>
        <Field label="Phụ trách">{assignee}</Field>
        <Field label="Phương thức">{document.isBlindCount ? 'Kiểm kê mù (ẩn tồn)' : 'Kiểm kê thường (hiện tồn)'}</Field>
      </View>
      <View style={[styles.grid, styles.group, { borderColor: theme.border }]}>
        <Field label="Số phiếu"><Text style={[styles.value, styles.mono, { color: theme.text }]}>{document.code}</Text></Field>
        <Field label="Ngày lập">{withPerson(document.createdAt, document.createdByName)}</Field>
        <Field label="Lịch kiểm kê">{formatCountDate(document.scheduledDate)}</Field>
        <Field label="Kiểm kê đến ngày">{formatCountDay(document.dueDate)}</Field>
        <Field label="Mức ưu tiên">{isUrgentOpen(document) ? <StatusPill label="Khẩn" tone="danger" />
          : <Text style={[styles.value, { color: theme.text }]}>{PRIORITY_LABELS[document.priority] ?? document.priority}</Text>}</Field>
      </View>
      <View style={[styles.grid, styles.group, { borderColor: theme.border }]}>
        <Field label="Vòng đếm">{String(document.recountRound + 1)}</Field>
        <Field label="Tiến độ">{results ? `${counted}/${total} dòng` : '—'}</Field>
        <Field label="Dòng chênh lệch">{!results ? '—' : hidden ? 'Đã ẩn' : String(differences)}</Field>
        <Field label="Gửi kết quả">{withPerson(document.submittedAt, document.submittedByName)}</Field>
        <Field wide label="Chốt phiếu">{withPerson(document.finalizedAt ?? document.completedAt, document.finalizedByName)}</Field>
      </View>
    </View>}
  </View>;
}
const styles = StyleSheet.create({ root: { borderWidth: 1, borderRadius: Radius.xl },
  trigger: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  grow: { flex: 1, minWidth: 0, gap: 2 }, title: { fontFamily: FontFamily.semibold, fontSize: 15, lineHeight: 22 },
  summary: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  content: { borderTopWidth: 1, padding: 16, gap: 14 }, group: { borderTopWidth: 1, paddingTop: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }, field: { width: '50%', paddingRight: 12, gap: 2 }, wide: { width: '100%' },
  label: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16 }, value: { fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20 },
  mono: { fontFamily: FontFamily.mono } });

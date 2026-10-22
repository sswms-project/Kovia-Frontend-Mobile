import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { AlertBanner } from '@/components/ui/alert-banner';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { WarehouseWorkspaceGate } from '@/components/warehouse-workspace';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDateTime } from '@/lib/date-format';
import { DISCREPANCY_STATUS, DISCREPANCY_TYPE } from '../discrepancies.schema';
import { useDiscrepancyDetail } from '../hooks/use-discrepancy-detail';
import { useDiscrepancyComposer } from '../hooks/use-discrepancy-composer';
import { DiscrepancyComposer } from '../components/discrepancy-composer';

export function DiscrepancyDetailScreen({ id }: { readonly id: string }) {
  const selection = useWarehouseSelection();
  return <DetailScreen key={`${selection.identity}:${selection.signature}:${selection.revision}:${id}`} id={id} />;
}
function DetailScreen({ id }: { readonly id: string }) {
  const query = useDiscrepancyDetail(id);
  const report = query.data;
  const theme = useTheme();
  const composer = useDiscrepancyComposer({ id, warehouseId: report?.warehouseId ?? '', productId: report?.productId ?? '',
    slotId: report?.slotId ?? '', lotId: report?.lotId ?? null }, report, () => { void query.refetch(); });
  if (!query.workspace.canView) return <WarehouseWorkspaceGate access={query.workspace.access} message="Bạn chưa có quyền xem báo cáo tại kho này." />;
  if (!query.valid) return <AlertBanner variant="destructive" title="Mã báo cáo không hợp lệ." />;
  if (query.isPending) return <LoadingState fullScreen />;
  if (query.isError || !report) return <ErrorState fullScreen error={query.error} onRetry={() => { void query.refetch(); }} />;
  const canAdd = composer.canReport && report.reportedByUserId === query.workspace.access.profile.data?.id &&
    report.status === 'EvidenceRequested' && !!report.version && !query.isFetching;
  return <><ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
    <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{report.code}</Text>
    <AlertBanner title={`${DISCREPANCY_TYPE[report.type]} · ${DISCREPANCY_STATUS[report.status]}`} description="Quan sát hiện trường không tự điều chỉnh tồn kho." />
    {[`${report.sku} · ${report.productName}`, `${report.warehouseName} / ${report.slotCode}`, `Lô: ${report.lotNumber ?? 'Không theo lô'}`,
      `Chênh lệch: ${report.observedDifference}`, report.correctSlotCode ? `Vị trí đúng: ${report.correctSlotCode}` : '',
      `Người báo: ${report.reportedByName} · ${formatDisplayDateTime(new Date(report.createdAt))}`, report.description,
      report.reviewReason ? `Phản hồi: ${report.reviewReason}` : '', report.responsibleUserName ? `Người xử lý: ${report.responsibleUserName}` : '',
      report.linkedCycleCountId ? 'Đã liên kết đợt kiểm kê. Thực hiện kiểm đếm trong Công việc nếu được giao.' : '',
      report.linkedStockAdjustmentId ? 'Đã liên kết phiếu điều chỉnh; quản lý theo dõi việc duyệt trên web.' : '',
      report.duplicateOfReportId ? `Báo cáo trùng với hồ sơ ${report.duplicateOfReportId}` : '',
    ].filter(Boolean).map((line, index) => <Text key={index} style={[styles.text, { color: theme.text }]}>{line}</Text>)}
    <Text style={[styles.heading, { color: theme.text }]}>Bằng chứng ({report.evidence.length})</Text>
    {report.evidence.map((file) => <Text key={file.id} style={[styles.text, { color: theme.textSecondary }]}>{file.fileName}</Text>)}
    {canAdd && <Button label="Bổ sung ảnh theo yêu cầu" onPress={composer.begin} />}
    <Text style={[styles.heading, { color: theme.text }]}>Lịch sử xử lý</Text>
    {report.history.map((event, index) => <View key={index} style={[styles.event, { borderColor: theme.border }]}>
      <Text style={[styles.text, { color: theme.text }]}>{event.actorName} · {formatDisplayDateTime(new Date(event.createdAt))}</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>{event.reason || 'Đã cập nhật báo cáo'}{event.toState && event.toState in DISCREPANCY_STATUS ? ` · ${DISCREPANCY_STATUS[event.toState as keyof typeof DISCREPANCY_STATUS]}` : ''}</Text>
    </View>)}
    <Button label="Tải lại trạng thái" variant="outline" loading={query.isFetching} disabled={composer.busy} onPress={() => { void query.refetch(); }} />
  </ScrollView><DiscrepancyComposer state={composer} title="Bổ sung ảnh bằng chứng" summary={report.code} evidenceOnly /></>;
}
const styles = StyleSheet.create({ content: { padding: 20, gap: 14, maxWidth: 760, width: '100%', alignSelf: 'center', paddingBottom: 36 },
  title: { fontFamily: FontFamily.bold, fontSize: 24 }, heading: { fontFamily: FontFamily.semibold, fontSize: 17 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 }, event: { borderLeftWidth: 2, paddingLeft: 12, gap: 4 } });

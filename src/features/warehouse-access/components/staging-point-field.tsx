import { View, StyleSheet } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { SelectionField } from '@/components/ui/selection-field';
import type { WarehouseStagingPoints } from '@/lib/warehouse-contract.schema';

interface Props {
  readonly label: string; readonly points: WarehouseStagingPoints | null; readonly value: string;
  readonly frozen?: boolean; readonly disabled: boolean; readonly onChange: (slotId: string) => void;
}

export function StagingPointField({ label, points, value, frozen = false, disabled, onChange }: Props) {
  const options = points?.items.map(point => ({ value: point.slotId, label: point.label })) ?? [];
  if (points?.boundPoint && !options.some(option => option.value === points.boundPoint?.slotId))
    options.push({ value: points.boundPoint.slotId, label: points.boundPoint.label });
  return <View style={styles.section}>
    {points?.invalidDefault && <AlertBanner title="Điểm mặc định không còn hợp lệ. Chọn điểm hoạt động khác hoặc liên hệ quản lý." />}
    {!points?.items.length && <AlertBanner title="Chưa có điểm tập kết hợp lệ trong kho. Cần quản lý cấu hình trên web trước khi tiếp tục." />}
    <SelectionField label={label} value={value} options={options} disabled={disabled || frozen || !points?.items.length}
      onChange={slotId => { if (points?.items.some(point => point.slotId === slotId)) onChange(slotId); }} />
  </View>;
}
const styles = StyleSheet.create({ section: { gap: 12 } });

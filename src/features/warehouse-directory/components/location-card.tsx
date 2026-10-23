import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Code128Barcode } from '@/components/ui/code128-barcode';
import { ListCard } from '@/components/ui/list-card';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import {
  LOCATION_TYPE_LABEL,
  OCCUPANCY_LABEL,
  type WarehouseLocation,
} from '../warehouse-directory.types';

interface LocationCardProps {
  readonly location: WarehouseLocation;
}

const formatNumber = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

/** Zone / rack / slot path, e.g. "K01 / A02 / A02-03", so a picker can find the shelf at a glance. */
function formatPath(location: WarehouseLocation): string {
  if (location.type === 'Slot') return [location.zoneCode, location.rackCode, location.code].filter(Boolean).join(' / ');
  if (location.type === 'Rack') return [location.zoneCode, location.code].filter(Boolean).join(' / ');
  return location.code;
}

export const LocationCard = memo(function LocationCard({ location }: LocationCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const isActive = location.lifecycleStatus === 'Active';
  const capacity =
    location.capacity != null && location.capacityUsed != null
      ? `Sức chứa ${formatNumber(location.capacityUsed)} / ${formatNumber(location.capacity)} ${location.capacityUnitSymbol ?? ''}`.trim()
      : null;

  return (
    <View style={styles.wrapper}>
      <ListCard
        title={location.name?.trim() || location.code}
        subtitle={formatPath(location)}
        lines={[
          `${LOCATION_TYPE_LABEL[location.type] ?? location.type}${location.occupancyStatus ? ` · ${OCCUPANCY_LABEL[location.occupancyStatus] ?? location.occupancyStatus}` : ''}`,
          capacity,
          location.isOutboundStaging ? 'Khu xuất hàng tạm' : null,
          expanded ? 'Chạm để thu gọn' : 'Chạm để xem mã vạch',
        ]}
        pill={{ label: isActive ? 'Đang dùng' : 'Ngừng dùng', tone: isActive ? 'success' : 'neutral' }}
        onPress={() => setExpanded((value) => !value)}
      />
      {expanded ? (
        location.barcodeValue ? (
          <Code128Barcode value={location.barcodeValue} />
        ) : (
          <Text style={[styles.empty, { color: theme.textSecondary }]}>Vị trí này chưa có mã vạch.</Text>
        )
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  empty: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
});

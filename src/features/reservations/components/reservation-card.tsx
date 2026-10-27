import { StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDateTime } from '@/lib/date-format';
import { formatQuantity } from '@/lib/number-format';

import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_TONES, formatReservationReference } from '../reservations.labels';
import type { InventoryReservation } from '../reservations.types';

export function ReservationCard({ reservation }: { readonly reservation: InventoryReservation }) {
  const theme = useTheme();
  const statusLabel = RESERVATION_STATUS_LABELS[reservation.status];
  return (
    <View accessible accessibilityLabel={`${reservation.productName}, ${statusLabel}, giữ ${formatQuantity(reservation.reservedQuantity)}`}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <StatusPill label={statusLabel} tone={RESERVATION_STATUS_TONES[reservation.status]} />
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
            {reservation.productName}
            <Text style={[styles.sku, { color: theme.textSecondary }]}>  {reservation.productSku}</Text>
          </Text>
        </View>
        <Text style={[styles.quantity, { color: theme.text }]}>{formatQuantity(reservation.reservedQuantity)}</Text>
      </View>
      <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={2}>
        Vị trí {reservation.slotCode}{reservation.lotNumber ? ` · Lô ${reservation.lotNumber}` : ''}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
        {formatReservationReference(reservation.referenceType)}{reservation.referenceCode ? ` ${reservation.referenceCode}` : ''}
        {reservation.createdByName ? ` · ${reservation.createdByName}` : ''}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        Tạo {formatDisplayDateTime(new Date(reservation.createdAt))}
        {reservation.releasedAt ? ` · Nhả ${formatDisplayDateTime(new Date(reservation.releasedAt))}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, padding: 12, borderWidth: 1, borderRadius: Radius.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1, gap: 6 },
  name: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  sku: { fontFamily: FontFamily.mono, fontSize: 11 },
  quantity: { fontFamily: FontFamily.mono, fontSize: 18, lineHeight: 24 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
});

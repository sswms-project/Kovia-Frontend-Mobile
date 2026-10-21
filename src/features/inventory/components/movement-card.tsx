import { StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDateTime } from '@/lib/date-format';

import {
  formatInventoryLocation,
  formatMovementReference,
  formatMovementType,
  formatQuantity,
  formatSignedQuantity,
} from '../inventory.labels';
import type { StockMovement } from '../inventory.types';

interface MovementCardProps {
  readonly movement: StockMovement;
  /** Hide the product when the list is already scoped to a single product. */
  readonly showProduct?: boolean;
}

export function MovementCard({ movement, showProduct = true }: MovementCardProps) {
  const theme = useTheme();
  const isIncrease = movement.quantityChange > 0;
  const typeLabel = formatMovementType(movement.movementType);
  const unit = movement.unitName ? ` ${movement.unitName}` : '';

  return (
    <View
      accessible
      accessibilityLabel={`${typeLabel}, ${formatSignedQuantity(movement.quantityChange)}${unit}, tồn sau ${formatQuantity(movement.balanceAfter)}`}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <StatusPill label={typeLabel} tone="neutral" />
          {showProduct ? (
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
              {movement.productName}
              <Text style={[styles.sku, { color: theme.textSecondary }]}>  {movement.sku}</Text>
            </Text>
          ) : null}
        </View>
        <View style={styles.quantity}>
          {/* The sign is part of the number, so the direction never depends on colour alone. */}
          <Text style={[styles.change, { color: isIncrease ? theme.primary : theme.error }]}>
            {formatSignedQuantity(movement.quantityChange)}
          </Text>
          <Text style={[styles.balance, { color: theme.textSecondary }]}>
            Tồn sau {formatQuantity(movement.balanceAfter)}
          </Text>
        </View>
      </View>

      <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={2}>
        {formatInventoryLocation(movement)}
        {movement.lotNumber ? ` · Lô ${movement.lotNumber}` : ''}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
        {formatMovementReference(movement.referenceType)}
        {movement.referenceCode ? ` ${movement.referenceCode}` : ''} · {movement.performedByName}
      </Text>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        {formatDisplayDateTime(new Date(movement.occurredAt))}
      </Text>
      {movement.correctionReason ? (
        <Text style={[styles.meta, { color: theme.textSecondary }]}>
          Lý do sửa: {movement.correctionReason}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, padding: 12, borderWidth: 1, borderRadius: Radius.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1, gap: 6 },
  name: { fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  sku: { fontFamily: FontFamily.mono, fontSize: 11 },
  quantity: { alignItems: 'flex-end', gap: 2 },
  change: { fontFamily: FontFamily.mono, fontSize: 18, lineHeight: 24 },
  balance: { fontFamily: FontFamily.regular, fontSize: 11 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
});

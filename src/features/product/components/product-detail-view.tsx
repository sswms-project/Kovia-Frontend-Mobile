import { Image } from 'expo-image';
import { Package } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui/status-pill';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDisplayDate } from '@/lib/date-format';
import { formatQuantity } from '@/lib/number-format';

import {
  LOT_STATUS_LABEL,
  LOT_STATUS_TONE,
  PRODUCT_STATUS_LABEL,
  PRODUCT_STATUS_TONE,
  formatTrackingMode,
} from '../product.labels';
import type {
  ProductLot,
  ProductResponse,
  ProductSupplier,
  ProductUnitConversion,
} from '../product.types';
import { DetailSection, type SectionQuery } from './detail-section';
import { ProductBarcodeSection } from './product-barcode-section';

const IMAGE_SIZE = 96;

interface ProductDetailViewProps {
  readonly product: ProductResponse;
  readonly canViewInventory: boolean;
  readonly unitConversions: SectionQuery<ProductUnitConversion[]>;
  /** Only requested for lot-tracked products. */
  readonly lots: SectionQuery<ProductLot[]>;
  readonly suppliers: SectionQuery<ProductSupplier[]>;
}

const formatOptionalDate = (value: string | null) =>
  value ? formatDisplayDate(new Date(value)) : '—';

export function ProductDetailView({
  product,
  canViewInventory,
  unitConversions,
  lots,
  suppliers,
}: ProductDetailViewProps) {
  const theme = useTheme();
  const rows: readonly { label: string; value: string }[] = [
    { label: 'Nhóm vật tư hàng hóa', value: product.categoryName ?? 'Chưa phân loại' },
    { label: 'Đơn vị tính', value: product.unitName },
    { label: 'Quản lý tồn kho', value: formatTrackingMode(product.isLotTracked) },
    ...(product.isLotTracked && product.shelfLifeDays !== null
      ? [{ label: 'Hạn sử dụng', value: `${product.shelfLifeDays} ngày` }]
      : []),
    ...(product.description ? [{ label: 'Mô tả', value: product.description }] : []),
  ];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            accessibilityLabel={`Ảnh ${product.productName}`}
            contentFit="cover"
            style={[styles.image, { borderColor: theme.border }]}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: theme.secondaryContainer }]}>
            <Package size={36} color={theme.primary} />
          </View>
        )}
        <Text accessibilityRole="header" style={[styles.name, { color: theme.text }]}>
          {product.productName}
        </Text>
        <Text style={[styles.sku, { color: theme.textSecondary }]}>{product.sku}</Text>
        <StatusPill label={PRODUCT_STATUS_LABEL[product.status]} tone={PRODUCT_STATUS_TONE[product.status]} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {rows.map((row) => (
          <View key={row.label} accessible style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{row.label}</Text>
            <Text style={[styles.value, { color: theme.text }]}>{row.value}</Text>
          </View>
        ))}
      </View>

      {canViewInventory ? (
        <View style={[styles.card, styles.quantities, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {[
            { label: 'Khả dụng', value: product.availableQuantity, isPrimary: true },
            { label: 'Tồn kho', value: product.quantityOnHand },
            { label: 'Giữ chỗ', value: product.reservedQuantity },
          ].map((quantity) => (
            <View
              key={quantity.label}
              accessible
              accessibilityLabel={`${quantity.label}: ${formatQuantity(quantity.value, 6)} ${product.unitName}`}
              style={styles.quantity}>
              <Text
                style={[styles.quantityValue, { color: quantity.isPrimary ? theme.primary : theme.text }]}>
                {formatQuantity(quantity.value, 6)}
              </Text>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{quantity.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <ProductBarcodeSection sku={product.sku} barcodeValue={product.barcodeValue} />

      <DetailSection
        title="Quy đổi đơn vị"
        isLoading={unitConversions.isLoading}
        error={unitConversions.error}
        isEmpty={(unitConversions.data ?? []).length === 0}
        emptyText="Sản phẩm chưa có quy đổi đơn vị."
        onRetry={unitConversions.onRetry}>
        {(unitConversions.data ?? []).map((conversion) => (
          <View key={conversion.id} accessible style={styles.listRow}>
            <Text style={[styles.value, { color: theme.text }]}>
              1 {conversion.unitName} = {formatQuantity(conversion.conversionFactor, 6)} {product.unitName}
            </Text>
            {conversion.status === 'Inactive' ? <StatusPill label="Đã ngừng" tone="neutral" /> : null}
          </View>
        ))}
      </DetailSection>

      {product.isLotTracked ? (
        <DetailSection
          title="Lô hàng"
          isLoading={lots.isLoading}
          error={lots.error}
          isEmpty={(lots.data ?? []).length === 0}
          emptyText="Chưa có lô nào."
          onRetry={lots.onRetry}>
          {(lots.data ?? []).map((lot) => (
            <View key={lot.id} accessible style={styles.lot}>
              <View style={styles.listRow}>
                <Text style={[styles.lotNumber, { color: theme.text }]}>{lot.lotNumber}</Text>
                <StatusPill label={LOT_STATUS_LABEL[lot.status]} tone={LOT_STATUS_TONE[lot.status]} />
              </View>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                HSD {formatOptionalDate(lot.expiryDate)} · Khả dụng {formatQuantity(lot.availableQuantity, 6)} /
                tồn {formatQuantity(lot.quantityOnHand, 6)}
              </Text>
              {lot.supplierName ? (
                <Text style={[styles.meta, { color: theme.textSecondary }]}>NCC {lot.supplierName}</Text>
              ) : null}
            </View>
          ))}
        </DetailSection>
      ) : null}

      <DetailSection
        title="Nhà cung cấp"
        isLoading={suppliers.isLoading}
        error={suppliers.error}
        isEmpty={(suppliers.data ?? []).length === 0}
        emptyText="Chưa gắn nhà cung cấp."
        onRetry={suppliers.onRetry}>
        {(suppliers.data ?? []).map((supplier) => (
          <View key={supplier.id} accessible style={styles.lot}>
            <View style={styles.listRow}>
              <Text style={[styles.lotNumber, { color: theme.text }]}>{supplier.supplierName}</Text>
              {supplier.isPreferred ? <StatusPill label="Ưu tiên" tone="primary" /> : null}
            </View>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {supplier.supplierCode}
              {supplier.supplierProductCode ? ` · Mã hàng NCC ${supplier.supplierProductCode}` : ''}
            </Text>
          </View>
        ))}
      </DetailSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 16, padding: 20, paddingBottom: 32 },
  identity: { alignItems: 'center', gap: 6 },
  image: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderWidth: 1, borderRadius: Radius.xl },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  name: { fontFamily: FontFamily.semibold, fontSize: 20, lineHeight: 28, textAlign: 'center' },
  sku: { fontFamily: FontFamily.mono, fontSize: 13 },
  card: { gap: 14, padding: 16, borderWidth: 1, borderRadius: Radius.xl },
  quantities: { flexDirection: 'row', justifyContent: 'space-between' },
  quantity: { flex: 1, gap: 2 },
  quantityValue: { fontFamily: FontFamily.mono, fontSize: 20, lineHeight: 26 },
  row: { gap: 2 },
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    letterSpacing: 0.77,
    textTransform: 'uppercase',
  },
  value: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 22 },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  lot: { gap: 2 },
  lotNumber: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 14, lineHeight: 20 },
  meta: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 17 },
});

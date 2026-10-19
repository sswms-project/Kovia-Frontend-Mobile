import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { InventoryStock } from '../../inventory-lookup.schema';

interface StockCardProps { readonly stock: InventoryStock }
const labels: Record<string, string> = { Good: 'Đạt', Damaged: 'Hư hỏng', Quarantine: 'Cách ly', Available: 'Khả dụng',
  InspectionHold: 'Chờ kiểm hàng', DamageHold: 'Tạm giữ hàng hỏng', Active: 'Đang hoạt động', Blocked: 'Tạm khóa', Expired: 'Hết hạn' };
export const StockCard = memo(function StockCard({ stock }: StockCardProps) {
  const theme = useTheme();
  const unit = stock.unitName || 'chưa có đơn vị';
  const location = [stock.zoneCode, stock.rackCode, stock.slotCode].filter(Boolean).join(' / ');
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.sku, { color: theme.primary }]}>{stock.sku}</Text>
    <Text style={[styles.name, { color: theme.text }]}>{stock.productName}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>{location}{stock.isSystemDefaultSlot ? ' · Vị trí mặc định' : ''}</Text>
    <View style={styles.quantities}>
      <Text style={[styles.available, { color: theme.primary }]}>Khả dụng: {stock.availableQuantity.toLocaleString('vi-VN')} {unit}</Text>
      <Text style={[styles.text, { color: theme.text }]}>Hiện có: {stock.quantityOnHand.toLocaleString('vi-VN')} {unit}</Text>
      <Text style={[styles.text, { color: theme.text }]}>Giữ chỗ: {stock.reservedQuantity.toLocaleString('vi-VN')} {unit}</Text>
      <Text style={[styles.text, { color: theme.text }]}>Tạm giữ: {stock.holdQuantity.toLocaleString('vi-VN')} {unit}</Text>
    </View>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Chất lượng: {labels[stock.qualityStatus] ?? stock.qualityStatus} · Điều kiện: {labels[stock.eligibilityStatus] ?? stock.eligibilityStatus}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Lô: {stock.lotNumber || 'Chưa có'}{stock.lotStatus ? ` · ${labels[stock.lotStatus] ?? stock.lotStatus}` : ''}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Ngày sản xuất: {stock.manufacturedDate || 'Chưa có'} · Hạn dùng: {stock.expiryDate || 'Chưa có'}</Text>
  </View>;
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: 16, gap: 8 },
  sku: { fontFamily: FontFamily.mono, fontSize: 16 }, name: { fontFamily: FontFamily.semibold, fontSize: 16 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 },
  available: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 24 }, quantities: { gap: 4 },
});

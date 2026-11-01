import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { TransferReceiptLine } from '../transfer-receiving.schema';

interface Props { readonly line: TransferReceiptLine; readonly lot: TransferReceiptLine['lots'][number]; readonly submitted: boolean }
export const ReceiptLotCard = memo(function ReceiptLotCard({ line, lot, submitted }: Props) {
  const theme = useTheme();
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
    <Text style={[styles.heading, { color: theme.text }]}>{line.sku} · {line.productName}</Text>
    <Text style={[styles.text, { color: theme.textSecondary }]}>Lô: {lot.lotNumber ?? 'Không có'}{lot.expiryDate ? ` · HSD ${lot.expiryDate}` : ''}</Text>
    <Text style={[styles.text, { color: theme.text }]}>Đã xuất từ kho nguồn: {lot.dispatchedQuantity} {line.baseUnitName}</Text>
    {submitted ? <>
      <Text style={[styles.text, { color: theme.text }]}>Kiểm lần đầu: thực nhận {lot.initialGoodQuantity} · hỏng {lot.initialDamagedQuantity} · thiếu {lot.initialMissingQuantity} {line.baseUnitName}</Text>
      <Text style={[styles.text, { color: theme.textSecondary }]}>Nhận bổ sung: {lot.lateReceivedQuantity} {line.baseUnitName}</Text>
      <Text style={[styles.text, { color: theme.text }]}>Tổng thực nhận đã ghi nhận: {lot.actualGoodQuantity} {line.baseUnitName}</Text>
    </> : <Text style={[styles.text, { color: theme.textSecondary }]}>Chưa có kết quả kiểm hàng đã gửi cho lô này.</Text>}
  </View>;
});
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 10 },
  heading: { fontFamily: FontFamily.semibold, fontSize: 17, lineHeight: 24 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 } });

import { QrCode } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { Code128Barcode } from '@/components/ui/code128-barcode';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ProductBarcodeSectionProps {
  readonly sku: string;
  readonly barcodeValue: string | null;
}

export function ProductBarcodeSection({ sku, barcodeValue }: ProductBarcodeSectionProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        Mã vạch sản phẩm
      </Text>

      {barcodeValue ? (
        <>
          <Code128Barcode value={barcodeValue} />
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Đưa mã này vào khung quét để tra cứu sản phẩm.
          </Text>
        </>
      ) : (
        <View style={styles.empty}>
          <QrCode size={28} color={theme.textSecondary} />
          <Text style={[styles.hint, { color: theme.textSecondary }]}>
            Sản phẩm {sku} chưa có mã vạch. Tạo mã vạch trên bản web.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 16, borderWidth: 1, borderRadius: Radius.xl },
  title: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 22 },
  hint: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 8 },
});

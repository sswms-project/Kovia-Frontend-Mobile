import { CameraView } from 'expo-camera';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface BarcodeCameraProps {
  readonly visible: boolean;
  readonly onScan: (value: string) => void;
  readonly onClose: () => void;
  readonly onFailure: () => void;
}
export function BarcodeCamera({ visible, onScan, onClose, onFailure }: BarcodeCameraProps) {
  const theme = useTheme();
  if (!visible) return null;
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Đưa một mã vào khung hình</Text>
      <View style={styles.preview}>
        <CameraView style={StyleSheet.absoluteFill} facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'itf14', 'datamatrix', 'pdf417'] }}
          onBarcodeScanned={({ data }) => onScan(data)} onMountError={onFailure} />
      </View>
      <Text style={[styles.text, { color: theme.textSecondary }]}>Camera sẽ đóng sau khi đọc một mã. Kết quả cần được đối chiếu trong kho đang chọn.</Text>
      <Button label="Đóng và nhập mã bằng tay" variant="outline" onPress={onClose} />
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1, padding: 20, gap: 16 }, preview: { flex: 1, minHeight: 200, overflow: 'hidden' },
  title: { fontFamily: FontFamily.semibold, fontSize: 20 }, text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21 } });

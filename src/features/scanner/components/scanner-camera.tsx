import { CameraView, type BarcodeType } from 'expo-camera';
import { Zap, ZapOff } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Warehouse labels are mostly 1D; QR and DataMatrix cover location and pallet labels.
const BARCODE_TYPES: BarcodeType[] = [
  'code128',
  'code39',
  'code93',
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'itf14',
  'codabar',
  'qr',
  'datamatrix',
];

interface ScannerCameraProps {
  /** False releases the camera, e.g. when the screen loses focus. */
  readonly isActive: boolean;
  readonly isTorchOn: boolean;
  readonly onToggleTorch: () => void;
  readonly onCode: (code: string) => void;
}

export function ScannerCamera({ isActive, isTorchOn, onToggleTorch, onCode }: ScannerCameraProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      {isActive ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={isTorchOn}
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
          onBarcodeScanned={(result) => onCode(result.data)}
          accessibilityLabel="Hình ảnh từ camera"
        />
      ) : null}

      <View pointerEvents="none" style={styles.frameLayer}>
        <View style={[styles.frame, { borderColor: theme.onScrim }]} />
        <View style={[styles.hint, { backgroundColor: theme.scrim }]}>
          <Text style={[styles.hintText, { color: theme.onScrim }]}>Đưa mã vào khung để quét</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isTorchOn ? 'Tắt đèn flash' : 'Bật đèn flash'}
        accessibilityState={{ selected: isTorchOn }}
        onPress={onToggleTorch}
        style={({ pressed }) => [
          styles.torch,
          { backgroundColor: theme.scrim },
          pressed && styles.pressed,
        ]}>
        {isTorchOn ? <Zap size={22} color={theme.onScrim} /> : <ZapOff size={22} color={theme.onScrim} />}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', borderRadius: Radius.xl },
  frameLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 16 },
  frame: { width: '72%', aspectRatio: 1.6, borderWidth: 2, borderRadius: Radius.xl },
  hint: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.lg },
  hintText: { fontFamily: FontFamily.medium, fontSize: 13 },
  torch: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  pressed: { opacity: 0.7 },
});

import JsBarcode from 'jsbarcode';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Code 128 needs at least 10 modules of empty space at both ends to be scannable.
const QUIET_ZONE_MODULES = 10;

interface Bar {
  readonly x: number;
  readonly width: number;
}

/** Same encoder the web uses (jsbarcode), rendered to its "object" target so no DOM is needed. */
function encodeCode128(value: string): string | null {
  try {
    const target: { encodings?: { data: string }[] } = {};
    JsBarcode(target, value, { format: 'CODE128' });
    return target.encodings?.map((encoding) => encoding.data).join('') ?? null;
  } catch {
    return null;
  }
}

function toBars(modules: string): readonly Bar[] {
  const bars: Bar[] = [];
  let runStart = -1;

  for (let index = 0; index <= modules.length; index += 1) {
    const isBar = modules[index] === '1';
    if (isBar && runStart < 0) runStart = index;
    if (!isBar && runStart >= 0) {
      bars.push({ x: runStart, width: index - runStart });
      runStart = -1;
    }
  }

  return bars;
}

interface Code128BarcodeProps {
  readonly value: string;
  readonly height?: number;
}

export function Code128Barcode({ value, height = 96 }: Code128BarcodeProps) {
  const theme = useTheme();
  const modules = encodeCode128(value);

  if (!modules) {
    return (
      <Text accessibilityRole="alert" style={[styles.error, { color: theme.error }]}>
        Giá trị mã vạch không hiển thị được bằng chuẩn Code 128.
      </Text>
    );
  }

  const totalModules = modules.length + QUIET_ZONE_MODULES * 2;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Mã vạch ${value}`}
      style={[styles.paper, { backgroundColor: theme.barcodePaper }]}>
      {/* A unit-height viewBox lets the bars scale to any width while staying pixel-exact per module. */}
      <Svg width="100%" height={height} viewBox={`0 0 ${totalModules} 1`} preserveAspectRatio="none">
        {toBars(modules).map((bar) => (
          <Rect
            key={bar.x}
            x={bar.x + QUIET_ZONE_MODULES}
            y={0}
            width={bar.width}
            height={1}
            fill={theme.barcodeInk}
          />
        ))}
      </Svg>
      <Text style={[styles.value, { color: theme.barcodeInk }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { gap: 8, padding: 12, borderRadius: Radius.md },
  value: { fontFamily: FontFamily.mono, fontSize: 13, textAlign: 'center' },
  error: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
});

import { Boxes } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Mirrors FE src/components/Logo.tsx: Boxes, circular green gradient, Baloo 2
// wordmark and a primary-colored O.
export function KoviaLogo() {
  const theme = useTheme();
  return <View accessible accessibilityRole="image" accessibilityLabel="Kovia" style={styles.logo}>
    <View style={styles.mark}>
      <Svg width={36} height={36} viewBox="0 0 36 36" accessible={false}>
        <Defs><LinearGradient id="koviaBrandGradient" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={theme.primary} /><Stop offset="1" stopColor={theme.primaryContainer} />
        </LinearGradient></Defs>
        <Circle cx={18} cy={18} r={18} fill="url(#koviaBrandGradient)" />
      </Svg>
      <View style={styles.icon} pointerEvents="none"><Boxes size={19} color={theme.onPrimary} /></View>
    </View>
    <Text style={[styles.wordmark, { color: theme.text }]} accessible={false}>K<Text style={{ color: theme.primary }}>O</Text>VIA</Text>
  </View>;
}

const styles = StyleSheet.create({
  logo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { width: 36, height: 36 },
  icon: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: FontFamily.logo, fontSize: 26, lineHeight: 38, letterSpacing: -0.6 },
});

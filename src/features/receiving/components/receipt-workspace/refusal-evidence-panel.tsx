import { Camera, CheckSquare, Square } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { useRefusalEvidence } from '../../hooks/use-refusal-evidence';
import { EvidenceFileRow } from './receipt-step';

export function RefusalEvidencePanel({ state }: { readonly state: ReturnType<typeof useRefusalEvidence> }) {
  const theme = useTheme();
  const Box = state.acknowledged ? CheckSquare : Square;
  return <View style={styles.root}>
    <Text style={[styles.hint, { color: theme.textSecondary }]}>Phần từ chối không vào tồn. Chỉ xác nhận khi bên giao đã giữ hoặc mang về; nếu kho vẫn giữ hàng thì chưa dùng từ chối trước nhận.</Text>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: state.acknowledged, disabled: state.busy }} disabled={state.busy}
      onPress={state.toggle} style={({ pressed }) => [styles.check, {
        borderColor: state.acknowledged ? theme.primary : theme.border,
        backgroundColor: state.acknowledged ? theme.primaryContainer : theme.card,
      }, (state.busy || pressed) && styles.dim]}>
      <Box size={22} color={state.acknowledged ? theme.primary : theme.textSecondary} />
      <Text style={[styles.checkLabel, { color: state.acknowledged ? theme.onPrimaryContainer : theme.text }]}>Bên giao đã giữ/mang về hàng từ chối</Text>
    </Pressable>
    {state.files.map(file => <EvidenceFileRow key={file.id} fileName={file.fileName} disabled={state.busy} onRemove={() => state.remove(file.id)} />)}
    <Button label="Thêm ảnh bằng chứng" accessibilityLabel="Thêm ảnh bằng chứng kiểm/từ chối" variant="outline" loading={state.busy}
      disabled={state.files.length >= 5} renderIcon={color => <Camera size={18} color={color} />} onPress={() => { void state.addPhoto(); }} />
    {state.error && <AlertBanner variant="destructive" title={state.error} />}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  hint: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 12, borderWidth: 1, borderRadius: Radius.md },
  checkLabel: { flex: 1, fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 20 },
  dim: { opacity: 0.6 },
});

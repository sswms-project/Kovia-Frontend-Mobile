import { Camera, Images } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { useDocumentEvidence } from '../../hooks/use-document-evidence';
import { EvidenceFileRow } from './receipt-step';

export function DocumentEvidencePanel({ state }: { readonly state: ReturnType<typeof useDocumentEvidence> }) {
  const theme = useTheme();
  const full = state.files.length >= 5;
  return <View style={styles.root}>
    {state.files.length === 0 && <Text style={[styles.hint, { color: theme.textSecondary }]}>Chụp phiếu giao hàng có chữ ký để đính kèm vào phiếu nhận.</Text>}
    {state.files.map(file => <EvidenceFileRow key={file.id} fileName={file.fileName} disabled={state.busy} onRemove={() => state.remove(file.id)} />)}
    <View style={styles.actions}>
      <View style={styles.action}><Button label="Chụp phiếu" variant="outline" loading={state.busy} disabled={full}
        renderIcon={color => <Camera size={18} color={color} />} onPress={() => { void state.addPhoto('camera'); }} /></View>
      <View style={styles.action}><Button label="Thư viện" accessibilityLabel="Chọn ảnh phiếu từ thư viện" variant="outline" disabled={state.busy || full}
        renderIcon={color => <Images size={18} color={color} />} onPress={() => { void state.addPhoto('library'); }} /></View>
    </View>
    {state.error && <AlertBanner variant="destructive" title={state.error} />}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  hint: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  action: { flex: 1 },
});

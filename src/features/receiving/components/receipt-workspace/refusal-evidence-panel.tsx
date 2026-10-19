import { Text, View } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { useRefusalEvidence } from '../../hooks/use-refusal-evidence';

export function RefusalEvidencePanel({ state }: { readonly state: ReturnType<typeof useRefusalEvidence> }) {
  const theme = useTheme();
  return <View style={{ gap: 10 }}>
    <AlertBanner title="Phần từ chối không vào tồn" description="Chỉ xác nhận khi bên giao đã giữ hoặc mang về phần này. Nếu kho vẫn giữ hàng, chưa dùng thao tác từ chối trước nhận." />
    <Button label={state.acknowledged ? 'Đã xác nhận bên giao giữ/mang về hàng từ chối' : 'Xác nhận bên giao giữ/mang về hàng từ chối'}
      variant={state.acknowledged ? 'primary' : 'outline'} disabled={state.busy} onPress={state.toggle} />
    {state.files.map(file => <View key={file.id} style={{ gap: 4 }}>
      <Text style={{ color: theme.text, fontFamily: FontFamily.regular }}>{file.fileName}</Text>
      <Button label={`Bỏ ảnh ${file.fileName}`} variant="ghost" disabled={state.busy} onPress={() => state.remove(file.id)} />
    </View>)}
    <Button label="Thêm ảnh bằng chứng kiểm/từ chối" variant="outline" loading={state.busy} disabled={state.files.length >= 5} onPress={() => { void state.addPhoto(); }} />
    {state.error && <AlertBanner variant="destructive" title={state.error} />}
  </View>;
}

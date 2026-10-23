import { Image } from 'expo-image';
import { useWindowDimensions, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './button';
import { AlertBanner } from './alert-banner';
import { LoadingState } from './loading-state';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { EvidenceFile, useEvidencePreview } from '@/hooks/use-evidence-preview';

export function EvidenceLinks({ files, onOpen }: { readonly files: readonly EvidenceFile[]; readonly onOpen: (file: EvidenceFile) => void }) {
  return <View style={styles.links}>{files.map(file => <Button key={file.id} label={`Xem ảnh: ${file.fileName}`} variant="outline" onPress={() => onOpen(file)} />)}</View>;
}
export function EvidencePreview({ state }: { readonly state: ReturnType<typeof useEvidencePreview> }) {
  const theme = useTheme(); const dimensions = useWindowDimensions(); const preview = state.preview;
  return <Modal visible={!!preview} onRequestClose={state.close} animationType="fade">
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]} numberOfLines={2}>{preview?.file.fileName}</Text>
      <ScrollView maximumZoomScale={4} minimumZoomScale={1} centerContent contentContainerStyle={styles.imageContainer}>
        {preview?.error ? <AlertBanner variant="destructive" title={preview.error} /> : preview?.uri
          ? <Image source={{ uri: preview.uri }} style={{ width: dimensions.width - 32, height: Math.max(240, dimensions.height - 240) }}
              contentFit="contain" cachePolicy="none" accessibilityLabel="Ảnh bằng chứng đã lưu" onError={state.imageError} />
          : <LoadingState />}
      </ScrollView>
      {preview?.error && <Button label="Tải lại ảnh" variant="outline" onPress={() => { void state.open(preview.file); }} />}
      <Button label="Đóng ảnh" onPress={state.close} />
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1, padding: 16, gap: 12 }, title: { fontFamily: FontFamily.semibold, fontSize: 17 },
  imageContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' }, links: { gap: 8 } });

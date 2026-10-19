import { zodResolver } from '@hookform/resolvers/zod';
import { useCameraPermissions } from 'expo-camera';
import { useIsFocused } from 'expo-router';
import { CameraOff, X } from 'lucide-react-native';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ManualCodeEntry } from '../components/manual-code-entry';
import { ScanStatus } from '../components/scan-status';
import { ScannerCamera } from '../components/scanner-camera';
import { useScanGuard } from '../hooks/use-scan-guard';
import { manualCodeSchema, type ManualCodeFormValues } from '../scanner.schema';
import type { ScanResult } from '../scanner.types';

interface ScannerScreenProps {
  readonly title: string;
  /** Called once per accepted code. Return true/false so the scanner can give success/error feedback. */
  readonly onScan: (code: string) => ScanResult;
  readonly onClose: () => void;
  readonly repeatGuardMs?: number;
  readonly onCameraFailure?: () => void;
}

/** Shared scanner for inbound, outbound and stocktake flows. The owning feature supplies `onScan`. */
export function ScannerScreen({ title, onScan, onClose, repeatGuardMs, onCameraFailure }: ScannerScreenProps) {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const { handleCode, isProcessing, lastScan } = useScanGuard(onScan, repeatGuardMs);

  const manualForm = useForm<ManualCodeFormValues>({
    resolver: zodResolver(manualCodeSchema),
    defaultValues: { code: '' },
  });

  const isCameraGranted = permission?.granted === true;
  // Without camera access the typed fallback is the only way in, so it must already be open.
  const isManualVisible = isManualOpen || cameraFailed || (permission !== null && !isCameraGranted);

  async function handleManualSubmit(values: ManualCodeFormValues) {
    await handleCode(values.code, { isManual: true });
    manualForm.reset();
  }

  function renderBody() {
    if (cameraFailed) return <EmptyState icon={CameraOff} title="Không thể sử dụng camera"
      description="Vui lòng nhập mã thủ công bên dưới." />;
    if (permission === null) return <LoadingState message="Đang kiểm tra quyền camera…" />;

    if (!permission.granted) {
      return (
        <EmptyState
          icon={CameraOff}
          title="Cần quyền truy cập camera"
          description="Cho phép dùng camera để quét mã vạch, hoặc nhập mã thủ công bên dưới."
          actionLabel={permission.canAskAgain ? 'Cấp quyền camera' : 'Mở cài đặt'}
          onAction={() => {
            if (permission.canAskAgain) void requestPermission();
            else void Linking.openSettings();
          }}
        />
      );
    }

    return (
      <ScannerCamera
        isActive={isFocused}
        isTorchOn={isTorchOn}
        onToggleTorch={() => setIsTorchOn((value) => !value)}
        onCode={(code) => void handleCode(code)}
        onFailure={() => { setCameraFailed(true); onCameraFailure?.(); }}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <View style={styles.header}>
          <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: theme.text }]}>
            {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng màn quét"
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
            <X size={22} color={theme.text} />
          </Pressable>
        </View>

        <View style={styles.body}>{renderBody()}</View>

        <ScrollView
          style={styles.panel}
          contentContainerStyle={styles.panelContent}
          keyboardShouldPersistTaps="handled">
          <ScanStatus isProcessing={isProcessing} lastScan={lastScan} />
          {isManualVisible ? (
            <ManualCodeEntry
              form={manualForm}
              onSubmit={(values) => void handleManualSubmit(values)}
              isBusy={isProcessing}
            />
          ) : (
            <Button variant="outline" label="Nhập mã thủ công" onPress={() => setIsManualOpen(true)} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 20 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  body: { flex: 1, marginHorizontal: 20 },
  panel: { flexGrow: 0, maxHeight: '45%' },
  panelContent: { gap: 14, padding: 20 },
});

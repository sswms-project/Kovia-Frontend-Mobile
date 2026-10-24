import { ScanLine } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ScanResult } from '../scanner.types';
import { ScannerScreen } from '../screens/scanner-screen';

interface Props {
  readonly label: string;
  readonly title: string;
  readonly disabled?: boolean;
  /** Small chip for label rows and card headers instead of a full-width button. */
  readonly compact?: boolean;
  /** Keep the scanner open after an accepted code, e.g. counting items one scan at a time. */
  readonly continuous?: boolean;
  readonly status?: string;
  readonly onScan: (code: string) => ScanResult;
  readonly onOpen?: () => void;
  /** Finishes a continuous session; the scanner closes after it runs. */
  readonly confirm?: { readonly label: string; readonly disabled?: boolean; readonly onPress: () => void };
  /** Return false to keep the scanner open, e.g. after the user declines to discard unconfirmed scans. */
  readonly onBeforeClose?: () => boolean | Promise<boolean>;
}

export function ScanCodeButton({ label, title, disabled = false, compact = false, continuous = false, status, onScan, onOpen, confirm, onBeforeClose }: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const session = useRef(0);
  useEffect(() => () => { session.current += 1; }, []);
  function start() { session.current += 1; onOpen?.(); setOpen(true); }
  function close() { session.current += 1; setOpen(false); }
  async function requestClose() { if (!onBeforeClose || await onBeforeClose()) close(); }
  return <>
    {compact
      ? <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} hitSlop={6} onPress={start}
        style={({ pressed }) => [styles.chip, { borderColor: theme.border, backgroundColor: theme.card }, disabled && styles.inactive, pressed && styles.pressed]}>
        <ScanLine size={16} color={theme.primary} />
        <Text style={[styles.chipLabel, { color: theme.primary }]} numberOfLines={1}>{label}</Text>
      </Pressable>
      : <Button label={label} variant="outline" disabled={disabled} onPress={start} />}
    <Modal visible={open && !disabled} animationType="slide" onRequestClose={() => { void requestClose(); }}>
      <View style={styles.root}>{open && !disabled && <ScannerScreen title={title} status={status} repeatGuardMs={continuous ? 1000 : undefined}
        onClose={() => { void requestClose(); }}
        confirm={confirm && { ...confirm, onPress: () => { confirm.onPress(); close(); } }}
        onScan={async (code) => {
          const attempt = session.current;
          const accepted = await onScan(code);
          if (!continuous && attempt === session.current && accepted === true) close();
          return accepted;
        }} />}</View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, paddingHorizontal: 10, borderWidth: 1, borderRadius: Radius.xl },
  chipLabel: { fontFamily: FontFamily.semibold, fontSize: 13, lineHeight: 18 },
  inactive: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});

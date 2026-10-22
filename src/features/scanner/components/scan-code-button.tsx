import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import type { ScanResult } from '../scanner.types';
import { ScannerScreen } from '../screens/scanner-screen';

interface Props {
  readonly label: string;
  readonly title: string;
  readonly disabled?: boolean;
  readonly onScan: (code: string) => ScanResult;
}

export function ScanCodeButton({ label, title, disabled = false, onScan }: Props) {
  const [open, setOpen] = useState(false);
  const session = useRef(0);
  useEffect(() => () => { session.current += 1; }, []);
  function close() { session.current += 1; setOpen(false); }
  return <>
    <Button label={label} variant="outline" disabled={disabled} onPress={() => { session.current += 1; setOpen(true); }} />
    <Modal visible={open && !disabled} animationType="slide" onRequestClose={close}>
      <View style={styles.root}>{open && !disabled && <ScannerScreen title={title} onClose={close} onScan={async (code) => {
        const attempt = session.current;
        const accepted = await onScan(code);
        if (attempt === session.current && accepted === true) close();
        return accepted;
      }} />}</View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({ root: { flex: 1 } });

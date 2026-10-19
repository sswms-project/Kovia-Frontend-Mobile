import { Modal } from 'react-native';
import { ScannerScreen } from '@/features/scanner/screens/scanner-screen';

interface BarcodeCameraProps {
  readonly visible: boolean;
  readonly onScan: (value: string) => void;
  readonly onClose: () => void;
  readonly onFailure: () => void;
}
export function BarcodeCamera({ visible, onScan, onClose, onFailure }: BarcodeCameraProps) {
  if (!visible) return null;
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <ScannerScreen title="Quét mã để tra cứu" onScan={onScan} onClose={onClose} onCameraFailure={onFailure} />
  </Modal>;
}

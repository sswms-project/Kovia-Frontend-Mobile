import { useRef, useState } from 'react';
import { Alert } from 'react-native';

import { nextScanQuantity } from '../warehouse-scan';
import { ScanCodeButton } from './scan-code-button';

interface Props {
  readonly title: string; readonly quantity: number; readonly maximum: number; readonly unitName: string;
  readonly step?: number; readonly disabled: boolean; readonly matches: (code: string) => boolean;
  readonly onConfirm: (quantity: number, code: string) => void;
}

// Same explicit pending-scan confirmation as receiving: camera events never submit warehouse commands.
export function ScanCountButton({ title, quantity, maximum, unitName, step = 1, disabled, matches, onConfirm }: Props) {
  const count = useRef(0);
  const base = useRef(0);
  const lastCode = useRef('');
  const [scanned, setScanned] = useState(0);
  function reset() { count.current = 0; lastCode.current = ''; setScanned(0); }
  return <ScanCodeButton compact continuous label="Quét đếm" title={title} disabled={disabled}
    status={`Đã quét ${scanned} lượt · Mỗi lượt ${step} ${unitName} · Tối đa ${maximum} ${unitName}`}
    onOpen={() => { reset(); base.current = Number.isFinite(quantity) ? quantity : 0; }}
    onScan={code => {
      if (disabled || !matches(code) || nextScanQuantity(base.current, count.current + 1, step, maximum) === null) return false;
      count.current++; lastCode.current = code.trim(); setScanned(count.current); return true;
    }}
    confirm={{ label: `Xác nhận ${scanned} lượt quét`, disabled: disabled || scanned === 0,
      onPress: () => {
        const value = nextScanQuantity(base.current, count.current, step, maximum);
        if (base.current !== (Number.isFinite(quantity) ? quantity : 0))
          Alert.alert('Số lượng đã thay đổi', 'Vui lòng kiểm tra số lượng hiện tại và quét lại. Các lượt này chưa được cộng.');
        else if (!disabled && value !== null && count.current > 0) onConfirm(value, lastCode.current);
        reset();
      } }}
    onBeforeClose={() => count.current === 0 || new Promise<boolean>(resolve => Alert.alert('Bỏ lượt quét?',
      'Các lượt quét chưa xác nhận sẽ không được cộng vào số thực tế.', [
        { text: 'Quét tiếp', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Bỏ', style: 'destructive', onPress: () => { reset(); resolve(true); } },
      ], { cancelable: true, onDismiss: () => resolve(false) }))} />;
}

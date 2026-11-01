import { useEffect } from 'react';

import { speak } from '@/lib/speech';
import { useSpeechPreference } from '@/stores/speech.store';

import { buildAlertSpeech, hasUrgentAlerts, type AlertCount } from '../stock-alert-speech';

// Kho đã đọc trong phiên ứng dụng hiện tại, tránh đọc lại mỗi lần quay về màn hình.
const announced = new Set<string>();

/** Tự đọc cảnh báo khẩn một lần mỗi kho mỗi phiên khi người dùng bật. */
export function useAlertAutoRead(warehouseId: string | null, counts: readonly AlertCount[], ready: boolean) {
  const enabled = useSpeechPreference(s => s.autoReadAlerts && s.hydrated);
  const urgent = hasUrgentAlerts(counts);
  useEffect(() => {
    if (!enabled || !ready || !warehouseId || !urgent || announced.has(warehouseId)) return;
    announced.add(warehouseId);
    speak(buildAlertSpeech(counts));
  }, [enabled, ready, urgent, warehouseId, counts]);
}

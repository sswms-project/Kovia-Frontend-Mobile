import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';

import { logger } from '@/lib/logger';
import { useScanFeedback } from '@/providers/scan-feedback-provider';

import type { LastScan, ScanResult } from '../scanner.types';

/** Holding the camera on one code reads it many times a second; repeats inside this window are ignored. */
export const REPEAT_GUARD_MS = 1500;

interface HandleCodeOptions {
  /** A typed code is deliberate, so it skips the repeat window (the processing lock still applies). */
  readonly isManual?: boolean;
}

export function useScanGuard(onScan: (code: string) => ScanResult, repeatGuardMs = REPEAT_GUARD_MS) {
  const playFeedback = useScanFeedback();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScan, setLastScan] = useState<LastScan | null>(null);
  // Refs, not state: the camera fires faster than React re-renders and must see the lock synchronously.
  const isLockedRef = useRef(false);
  const lastSeenRef = useRef({ code: '', at: 0 });

  const handleCode = useCallback(
    async (rawCode: string, { isManual = false }: HandleCodeOptions = {}) => {
      const code = rawCode.trim();
      if (!code) return;

      const now = Date.now();
      const isRepeat =
        !isManual && code === lastSeenRef.current.code && now - lastSeenRef.current.at < repeatGuardMs;
      // Extend the window while the code stays in view, even while locked, so it cannot re-fire on unlock.
      lastSeenRef.current = { code, at: now };
      if (isLockedRef.current || isRepeat) return;

      isLockedRef.current = true;
      setIsProcessing(true);
      try {
        const verdict = await onScan(code);
        const isValid = typeof verdict === 'boolean' ? verdict : null;
        setLastScan({ code, isValid });
        if (isValid !== null) {
          playFeedback(isValid);
          void Haptics.notificationAsync(
            isValid ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
          ).catch(() => { logger.warn('Không thể rung phản hồi quét mã.'); });
        }
      } catch (error) {
        logger.error('Scan handler failed', error);
        setLastScan({ code, isValid: false });
        playFeedback(false);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          .catch(() => { logger.warn('Không thể rung phản hồi quét mã.'); });
      } finally {
        lastSeenRef.current = { code, at: Date.now() };
        isLockedRef.current = false;
        setIsProcessing(false);
      }
    },
    [onScan, repeatGuardMs, playFeedback],
  );

  return { handleCode, isProcessing, lastScan };
}

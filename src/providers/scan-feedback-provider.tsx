import { setAudioModeAsync, setIsAudioActiveAsync, useAudioPlayer, type AudioPlayer } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';

import { logger } from '@/lib/logger';

const ScanFeedbackContext = createContext<((valid: boolean, reportFailure?: boolean) => void) | null>(null);

function waitForSound(player: AudioPlayer, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(new Error('Đã đóng lượt phát âm báo.'));
  if (player.isLoaded) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const finish = (failure?: Error) => {
      clearTimeout(timer); subscription.remove(); signal.removeEventListener('abort', cancel);
      if (failure) reject(failure); else resolve();
    };
    const cancel = () => finish(new Error('Đã đóng lượt phát âm báo.'));
    const timer = setTimeout(() => finish(new Error('Không tải được âm báo. Kiểm tra kết nối với Expo rồi thử lại.')), 3_000);
    const subscription = player.addListener('playbackStatusUpdate', status => {
      if (status.error) finish(new Error('Bộ phát không đọc được file âm báo. Hãy tải lại ứng dụng.'));
      else if (status.isLoaded) finish();
    });
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
    else if (player.isLoaded) finish();
  });
}

/** Players outlive the camera modal so its automatic close cannot cut off the final beep. */
export function ScanFeedbackProvider({ children }: { readonly children: ReactNode }) {
  const success = useAudioPlayer(require('../../assets/sounds/scan-success.wav'), { downloadFirst: true, keepAudioSessionActive: true });
  const error = useAudioPlayer(require('../../assets/sounds/scan-error.wav'), { downloadFirst: true, keepAudioSessionActive: true });
  const active = useRef(AppState.currentState === 'active');
  const sequence = useRef(0);
  const audioMode = useRef<Promise<void> | null>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    active.current = AppState.currentState === 'active';
    const subscription = AppState.addEventListener('change', state => {
      active.current = state === 'active';
      if (!active.current) {
        sequence.current += 1;
        pending.current?.abort();
        try { success.pause(); error.pause(); }
        catch { logger.warn('Không thể dừng âm báo quét mã.'); }
      }
    });
    return () => { active.current = false; sequence.current += 1; pending.current?.abort(); subscription.remove(); };
  }, [success, error]);

  const play = useCallback((valid: boolean, reportFailure = false) => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const attempt = ++sequence.current;
    const player = valid ? success : error;
    async function playSound() {
      if (!active.current) return;
      audioMode.current ??= setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false,
        shouldPlayInBackground: false, shouldRouteThroughEarpiece: false, interruptionMode: 'mixWithOthers' })
        .catch(failure => { audioMode.current = null; throw failure; });
      await audioMode.current;
      if (!active.current || attempt !== sequence.current) return;
      await setIsAudioActiveAsync(true);
      if (!active.current || attempt !== sequence.current) return;
      success.pause(); error.pause();
      // Android reports isLoaded=false at STATE_ENDED; seeking first returns an exhausted clip to READY.
      await player.seekTo(0);
      await waitForSound(player, controller.signal);
      if (active.current && attempt === sequence.current) player.play();
    }
    void playSound().catch(failure => {
      if (controller.signal.aborted || !active.current || attempt !== sequence.current) return;
      logger.warn('Không thể phát âm báo quét mã.', { verdict: valid, loaded: player.isLoaded, duration: player.duration, reason: failure instanceof Error ? failure.message : 'Unknown audio failure' });
      if (reportFailure) Alert.alert('Chưa phát được âm báo', failure instanceof Error ? failure.message : 'Hãy tải lại ứng dụng rồi thử lại.');
    });
  }, [success, error]);

  return <ScanFeedbackContext.Provider value={play}>{children}</ScanFeedbackContext.Provider>;
}

export function useScanFeedback() {
  const play = useContext(ScanFeedbackContext);
  if (!play) throw new Error('Màn quét mã cần ScanFeedbackProvider.');
  return play;
}

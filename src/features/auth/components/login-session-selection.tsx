import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';
import { isApiErrorResponse } from '@/lib/api-error';

import { authApi } from '../auth.api';
import { useAuth } from '../auth.store';
import type { LoginResponseDto } from '../auth.types';
import { AuthScreenLayout } from './auth-screen-layout';

export function LoginSessionSelection({ initial, onBack }: {
  readonly initial: LoginResponseDto;
  readonly onBack: () => void;
}) {
  const theme = useTheme();
  const applySignIn = useAuth((state) => state.applySignIn);
  const [selection, setSelection] = useState(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const sessions = selection.activeSessions ?? [];
  const full = sessions.length >= 2;

  async function submit() {
    if (submitting.current || expired || !selection.sessionSelectionTicket || (full && !selectedId)) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await authApi.completeSession(selection.sessionSelectionTicket, full ? selectedId : null);
      if (result.sessionSelectionTicket) {
        setSelection(result);
        setSelectedId(null);
        setError('Danh sách phiên đã thay đổi. Vui lòng kiểm tra lại.');
      } else await applySignIn(result);
    } catch (cause) {
      const invalid = isApiErrorResponse(cause) && cause.statusCode === 401;
      setExpired(invalid);
      setError(invalid ? 'Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại.' : 'Chưa thể hoàn tất đăng nhập. Vui lòng thử lại.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <AuthScreenLayout kicker="Đăng nhập" title={full ? 'Đã đủ 2 phiên đăng nhập' : 'Có chỗ cho phiên mới'}
      description={full ? 'Chọn một phiên để kết thúc và đăng nhập trên thiết bị này.' : 'Bạn có thể tiếp tục đăng nhập.'}>
      <View style={{ gap: 12 }}>
        {full && sessions.map((session) => {
          const checked = selectedId === session.id;
          return (
            <Pressable key={session.id} accessibilityRole="radio" accessibilityState={{ checked, disabled: pending || expired }}
              disabled={pending || expired} onPress={() => setSelectedId(session.id)}
              style={{ minHeight: 44, padding: 12, gap: 4, borderWidth: 1, borderColor: checked ? theme.primary : theme.border, backgroundColor: theme.card }}>
              <Text style={{ color: theme.text }}>{checked ? '◉' : '○'} {session.clientLabel}</Text>
              <Text style={{ color: theme.textSecondary }}>Hoạt động gần nhất {new Date(session.lastSeenAt).toLocaleString('vi-VN')}</Text>
            </Pressable>
          );
        })}
        {error && <Text accessibilityRole="alert" style={{ color: theme.text }}>{error}</Text>}
        <Button label={full ? 'Kết thúc phiên và đăng nhập' : 'Tiếp tục đăng nhập'} loading={pending}
          disabled={expired || (full && !selectedId)} onPress={() => void submit()} />
        <Button label="Quay lại" variant="outline" disabled={pending} onPress={onBack} />
      </View>
    </AuthScreenLayout>
  );
}

import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { toast } from 'sonner-native';

import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

import { authApi } from '../auth.api';
import { useAuth } from '../auth.store';
import type { LoginSessionSummary } from '../auth.types';
import { AuthFrame } from '../components/auth-form';

export function LoginSessionsScreen() {
  const theme = useTheme();
  const loginSessionId = useAuth((state) => state.loginSessionId);
  const [confirmation, setConfirmation] = useState<LoginSessionSummary | 'all' | null>(null);
  const submitting = useRef(false);
  const sessions = useQuery({
    queryKey: ['auth', 'login-sessions', loginSessionId],
    queryFn: ({ signal }) => authApi.listSessions(signal),
    enabled: Boolean(loginSessionId),
  });
  const revoke = useMutation({ mutationFn: authApi.revokeSession });

  async function confirm() {
    if (!loginSessionId || confirmation === null || submitting.current) return;
    submitting.current = true;
    try {
      await revoke.mutateAsync(confirmation === 'all' ? null : confirmation.id);
      if (useAuth.getState().loginSessionId !== loginSessionId) return;
      if (confirmation === 'all' || confirmation.id === loginSessionId) {
        await useAuth.getState().endLoginSession(loginSessionId);
        return;
      }
      setConfirmation(null);
      await sessions.refetch();
      toast.success('Đã kết thúc phiên đăng nhập.');
    } catch {
      setConfirmation(null);
      toast.error('Chưa thể xác nhận kết quả đăng xuất. Vui lòng kiểm tra lại danh sách.');
      await sessions.refetch();
    } finally {
      submitting.current = false;
    }
  }

  return (
    <AuthFrame topInset={false} title="Thiết bị đăng nhập" backLabel="Quay lại" onBack={() => router.back()}>
      <View style={{ gap: 16 }}>
        {!loginSessionId ? <Text style={{ color: theme.text }}>Tài khoản chưa sử dụng quản lý thiết bị đăng nhập.</Text>
          : sessions.isError ? <>
            <Text accessibilityRole="alert" style={{ color: theme.text }}>Không thể tải danh sách thiết bị.</Text>
            <Button label="Thử lại" variant="outline" onPress={() => void sessions.refetch()} />
          </> : sessions.isPending ? <Text style={{ color: theme.text }}>Đang tải thiết bị…</Text> : <>
            <Text style={{ color: theme.textSecondary }}>{sessions.data.length}/2 phiên đang hoạt động</Text>
            <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }}>
              {sessions.data.map((session, index) => (
                <View key={session.id} style={{ gap: 8, padding: 12, borderColor: theme.border, borderTopWidth: index ? 1 : 0 }}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{session.clientLabel}</Text>
                  <Text style={{ color: theme.textSecondary }}>Hoạt động gần nhất {new Date(session.lastSeenAt).toLocaleString('vi-VN')}</Text>
                  {session.isCurrent ? <Text style={{ color: theme.primary }}>Phiên hiện tại</Text>
                    : <Button label="Đăng xuất thiết bị này" variant="outline" disabled={sessions.isFetching || confirmation !== null}
                      onPress={() => setConfirmation(session)} />}
                </View>
              ))}
            </View>
            {confirmation === null ? <Button label="Đăng xuất tất cả thiết bị" variant="outline" disabled={sessions.isFetching}
              onPress={() => setConfirmation('all')} /> : (
              <View style={{ gap: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, padding: 12 }}>
                <Text accessibilityRole="alert" style={{ color: theme.text }}>
                  {confirmation === 'all' ? 'Tất cả thiết bị, gồm phiên hiện tại, sẽ cần đăng nhập lại.' : `${confirmation.clientLabel} sẽ cần đăng nhập lại.`}
                </Text>
                <Button label="Xác nhận đăng xuất" loading={revoke.isPending} onPress={() => void confirm()} />
                <Button label="Quay lại" variant="outline" disabled={revoke.isPending} onPress={() => setConfirmation(null)} />
              </View>
            )}
          </>}
      </View>
    </AuthFrame>
  );
}

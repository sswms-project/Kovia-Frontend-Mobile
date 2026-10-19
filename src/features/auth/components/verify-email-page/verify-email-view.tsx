import { AlertCircle, Clock3 } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { ResendVerificationFormValues } from '../../auth.schema';
import { AuthHeaderButton, AuthScreenLayout } from '../auth-screen-layout';

export type VerifyEmailStatus = 'missing' | 'loading' | 'success' | 'error';

interface VerifyEmailViewProps {
  readonly status: VerifyEmailStatus;
  readonly message: string;
  readonly resendForm: UseFormReturn<ResendVerificationFormValues>;
  readonly isResending: boolean;
  readonly onResend: (values: ResendVerificationFormValues) => void;
  readonly onGoToLogin: () => void;
}

export function VerifyEmailView({
  status,
  message,
  resendForm,
  isResending,
  onResend,
  onGoToLogin,
}: VerifyEmailViewProps) {
  const theme = useTheme();
  const submitResend = resendForm.handleSubmit(onResend);

  return (
    <AuthScreenLayout
      kicker="Xác minh email"
      title="Xác minh tài khoản"
      headerAction={<AuthHeaderButton label="Đăng nhập" onPress={onGoToLogin} />}>
      {status === 'loading' ? (
        <View accessibilityLiveRegion="polite" style={styles.state}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.body, { color: theme.textSecondary }]}>Đang xác minh email…</Text>
        </View>
      ) : null}

      {status === 'missing' ? (
        <StateBlock
          tone="error"
          kicker="Thiếu token xác minh"
          title="Link email chưa đầy đủ"
          body="Vui lòng mở đúng link xác minh được gửi tới email sau khi đăng ký tài khoản KOVIA.">
          <Button label="Về trang đăng nhập" onPress={onGoToLogin} />
        </StateBlock>
      ) : null}

      {status === 'success' ? (
        <StateBlock
          tone="success"
          kicker="Email đã được xác minh"
          title="Đăng ký đang chờ phê duyệt"
          body={message}>
          <Button label="Quay lại đăng nhập" onPress={onGoToLogin} />
        </StateBlock>
      ) : null}

      {status === 'error' ? (
        <StateBlock
          tone="error"
          kicker="Không thể xác minh email"
          title="Link xác minh không còn hợp lệ"
          body={message}>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            Nếu liên kết đã hết hạn, nhập email đã đăng ký để nhận một liên kết xác minh mới.
          </Text>
          <Controller
            control={resendForm.control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                label="Email đã đăng ký"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={submitResend}
              />
            )}
          />
          <Button label="Gửi lại email xác minh" loading={isResending} onPress={submitResend} />
          <Button variant="outline" label="Về trang đăng nhập" onPress={onGoToLogin} />
        </StateBlock>
      ) : null}
    </AuthScreenLayout>
  );
}

interface StateBlockProps {
  readonly tone: 'success' | 'error';
  readonly kicker: string;
  readonly title: string;
  readonly body: string;
  readonly children: ReactNode;
}

function StateBlock({ tone, kicker, title, body, children }: StateBlockProps) {
  const theme = useTheme();
  const isError = tone === 'error';
  const Icon = isError ? AlertCircle : Clock3;

  return (
    <View style={styles.state}>
      <View
        style={[styles.badge, { backgroundColor: isError ? theme.errorContainer : theme.secondaryContainer }]}>
        <Icon size={36} color={isError ? theme.error : theme.primary} />
      </View>
      <Text style={[styles.kicker, { color: isError ? theme.error : theme.primary }]}>{kicker}</Text>
      <Text accessibilityRole="header" style={[styles.stateTitle, { color: theme.text }]}>
        {title}
      </Text>
      <Text style={[styles.body, { color: theme.textSecondary }]}>{body}</Text>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  state: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  badge: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 36 },
  kicker: { fontFamily: FontFamily.semibold, fontSize: 12, textAlign: 'center' },
  stateTitle: { fontFamily: FontFamily.semibold, fontSize: 20, lineHeight: 28, textAlign: 'center' },
  body: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: 14, marginTop: 8 },
});

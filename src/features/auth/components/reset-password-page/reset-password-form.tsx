import * as Haptics from 'expo-haptics';
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useRef } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { StyleSheet, Text, View, type TextInput } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { ResetPasswordFormValues } from '../../auth.schema';
import { AuthHeaderButton, AuthScreenLayout } from '../auth-screen-layout';
import { PasswordRequirementList } from '../password-requirement-list';

interface ResetPasswordFormProps {
  readonly form: UseFormReturn<ResetPasswordFormValues>;
  readonly hasToken: boolean;
  readonly onSubmit: (values: ResetPasswordFormValues) => void;
  readonly isLoading: boolean;
  readonly isSuccess: boolean;
  readonly errorMessage?: string;
  readonly onGoToLogin: () => void;
  readonly onGoToForgotPassword: () => void;
}

export function ResetPasswordForm({
  form,
  hasToken,
  onSubmit,
  isLoading,
  isSuccess,
  errorMessage,
  onGoToLogin,
  onGoToForgotPassword,
}: ResetPasswordFormProps) {
  const theme = useTheme();
  const confirmRef = useRef<TextInput>(null);
  const password = useWatch({ control: form.control, name: 'password' }) ?? '';
  const confirmPassword = useWatch({ control: form.control, name: 'confirmPassword' }) ?? '';
  const submit = form.handleSubmit(onSubmit, () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  });
  const isMatched = password.length > 0 && password === confirmPassword;

  return (
    <AuthScreenLayout
      kicker="Bảo mật tài khoản"
      title="Đặt lại mật khẩu"
      headerAction={<AuthHeaderButton label="Đăng nhập" onPress={onGoToLogin} />}>
      {!hasToken ? (
        <>
          <AlertBanner
            variant="destructive"
            title="Link đặt lại mật khẩu không hợp lệ"
            description="Link thiếu mã xác thực. Vui lòng yêu cầu gửi lại email đặt mật khẩu."
          />
          <Button label="Gửi lại email" onPress={onGoToForgotPassword} />
        </>
      ) : isSuccess ? (
        <>
          <AlertBanner
            variant="success"
            title="Mật khẩu đã được cập nhật"
            description="Bạn sẽ được chuyển về trang đăng nhập trong giây lát."
          />
          <Button label="Đến trang đăng nhập" onPress={onGoToLogin} />
        </>
      ) : (
        <>
          {errorMessage ? (
            <AlertBanner variant="destructive" title="Không thể đặt lại mật khẩu" description={errorMessage} />
          ) : null}

          <Controller
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField
                label="Mật khẩu mới"
                isPassword
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
            )}
          />

          <PasswordRequirementList password={password} />

          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <View style={styles.confirm}>
                <TextField
                  inputRef={confirmRef}
                  label="Xác nhận mật khẩu"
                  isPassword
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={submit}
                />
                {confirmPassword ? (
                  <View accessibilityLiveRegion="polite" style={styles.hint}>
                    {isMatched ? (
                      <CheckCircle2 size={14} color={theme.primary} />
                    ) : (
                      <AlertCircle size={14} color={theme.error} />
                    )}
                    <Text style={[styles.hintText, { color: isMatched ? theme.primary : theme.error }]}>
                      {isMatched ? 'Mật khẩu xác nhận khớp' : 'Mật khẩu xác nhận chưa khớp'}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          />

          <Button label="Cập nhật mật khẩu" loading={isLoading} onPress={submit} />
        </>
      )}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  confirm: { gap: 6 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hintText: { fontFamily: FontFamily.regular, fontSize: 12 },
});

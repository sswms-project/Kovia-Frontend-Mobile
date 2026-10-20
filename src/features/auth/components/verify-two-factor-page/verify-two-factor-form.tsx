import * as Haptics from 'expo-haptics';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { OtpInput } from '@/components/ui/otp-input';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { VerifyTwoFactorFormValues } from '../../auth.schema';
import type { Verify2FAErrorKind } from '../../auth.utils';
import { AuthHeaderButton, AuthScreenLayout } from '../auth-screen-layout';

export type VerifyStep =
  | { status: 'form' }
  | { status: 'sessionExpired' }
  | { status: 'accountUnavailable'; reason: 'userNotFound' | 'inactive' };

interface VerifyTwoFactorFormProps {
  readonly form: UseFormReturn<VerifyTwoFactorFormValues>;
  readonly hasTempToken: boolean;
  readonly step: VerifyStep;
  readonly onSubmit: (values: VerifyTwoFactorFormValues) => void;
  readonly isLoading: boolean;
  readonly apiErrorKind: Verify2FAErrorKind | null;
  readonly onErrorClear: () => void;
  readonly onBackToLogin: () => void;
}

const API_ERROR_MESSAGES: Partial<Record<Verify2FAErrorKind, string>> = {
  invalidOtp: 'Mã OTP không đúng.',
  network: 'Lỗi mạng hoặc máy chủ. Vui lòng thử lại.',
  unknown: 'Đã xảy ra lỗi. Vui lòng thử lại.',
};

export function VerifyTwoFactorForm({
  form,
  hasTempToken,
  step,
  onSubmit,
  isLoading,
  apiErrorKind,
  onErrorClear,
  onBackToLogin,
}: VerifyTwoFactorFormProps) {
  const theme = useTheme();
  const submit = form.handleSubmit(onSubmit, () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  });
  // A step other than 'form' wins even after the temp token is cleared, otherwise the
  // "expired" message would immediately be replaced by the "missing session" one.
  const blockedMessage = getBlockedMessage(step, hasTempToken);

  return (
    <AuthScreenLayout
      kicker="Xác thực hai yếu tố"
      title="Nhập mã xác thực"
      description="Nhập mã OTP 6 số từ ứng dụng xác thực (Google/Microsoft Authenticator) để hoàn tất đăng nhập."
      headerAction={<AuthHeaderButton label="Đăng nhập" onPress={onBackToLogin} />}>
      {blockedMessage ? (
        <>
          <AlertBanner
            variant="destructive"
            title={blockedMessage.title}
            description={blockedMessage.description}
          />
          <Button variant="outline" label="Quay lại đăng nhập" onPress={onBackToLogin} />
        </>
      ) : (
        <>
          <Controller
            control={form.control}
            name="otp"
            render={({ field, fieldState }) => {
              const errorMessage = fieldState.error?.message ?? (apiErrorKind ? API_ERROR_MESSAGES[apiErrorKind] : undefined);
              return (
                <View style={styles.otp}>
                  <OtpInput
                    value={field.value}
                    onChangeText={(value) => {
                      if (apiErrorKind) onErrorClear();
                      field.onChange(value);
                    }}
                    invalid={Boolean(errorMessage)}
                    disabled={isLoading}
                  />
                  {errorMessage ? (
                    <Text accessibilityRole="alert" style={[styles.error, { color: theme.error }]}>
                      {errorMessage}
                    </Text>
                  ) : null}
                </View>
              );
            }}
          />
          <Button label="Xác nhận" loading={isLoading} onPress={submit} />
          <Button variant="outline" label="Quay lại đăng nhập" disabled={isLoading} onPress={onBackToLogin} />
        </>
      )}
    </AuthScreenLayout>
  );
}

function getBlockedMessage(step: VerifyStep, hasTempToken: boolean) {
  if (step.status === 'sessionExpired') {
    return {
      title: 'Phiên xác thực đã hết hạn',
      description: 'Phiên xác thực đã hết hạn hoặc không còn hợp lệ. Vui lòng đăng nhập lại.',
    };
  }
  if (step.status === 'accountUnavailable') {
    return {
      title: 'Không thể tiếp tục xác thực',
      description:
        step.reason === 'inactive'
          ? 'Tài khoản hiện không hoạt động. Vui lòng liên hệ quản trị viên.'
          : 'Không thể tiếp tục xác thực tài khoản này. Vui lòng đăng nhập lại.',
    };
  }
  if (!hasTempToken) {
    return {
      title: 'Phiên xác thực không tồn tại',
      description: 'Vui lòng đăng nhập lại để tiếp tục xác thực hai yếu tố.',
    };
  }
  return null;
}

const styles = StyleSheet.create({
  otp: { alignItems: 'center', gap: 10 },
  error: { fontFamily: FontFamily.regular, fontSize: 13, textAlign: 'center' },
});

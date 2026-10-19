import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { RefreshCw } from 'lucide-react-native';
import { useRef } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { LoginFormValues } from '../../auth.schema';
import type { CaptchaChallengeResponse } from '../../auth.types';
import { formatLockCountdown } from '../../auth.utils';
import { AuthScreenLayout } from '../auth-screen-layout';

interface LoginFormProps {
  readonly form: UseFormReturn<LoginFormValues>;
  readonly onSubmit: (values: LoginFormValues) => void;
  readonly isLoading: boolean;
  readonly captcha: CaptchaChallengeResponse | null;
  readonly isCaptchaLoading: boolean;
  readonly authNotice: string | null;
  readonly requiresVerification: boolean;
  readonly isResending: boolean;
  readonly lockSeconds: number;
  readonly onRefreshCaptcha: () => void;
  readonly onResendVerification: () => void;
  readonly onForgotPassword: () => void;
}

export function LoginForm({
  form,
  onSubmit,
  isLoading,
  captcha,
  isCaptchaLoading,
  authNotice,
  requiresVerification,
  isResending,
  lockSeconds,
  onRefreshCaptcha,
  onResendVerification,
  onForgotPassword,
}: LoginFormProps) {
  const theme = useTheme();
  const passwordRef = useRef<TextInput>(null);
  const { control, handleSubmit } = form;
  const submit = handleSubmit(onSubmit, () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  });

  return (
    <AuthScreenLayout
      kicker="Hệ thống quản lý kho"
      title="Đăng nhập"
      footer={<Text style={[styles.support, { color: theme.textSecondary }]}>Hỗ trợ: 1800-KOVIA</Text>}>
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label="Email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            inputRef={passwordRef}
            label="Mật khẩu"
            isPassword
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            labelAccessory={
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Quên mật khẩu"
                hitSlop={8}
                onPress={onForgotPassword}
                style={styles.linkTarget}>
                <Text style={[styles.link, { color: theme.textSecondary }]}>Quên mật khẩu?</Text>
              </Pressable>
            }
          />
        )}
      />

      {captcha ? (
        <View style={styles.captcha}>
          <View style={styles.captchaHeader}>
            <Text style={[styles.captchaLabel, { color: theme.text }]}>Kết quả CAPTCHA</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Làm mới CAPTCHA"
              disabled={isCaptchaLoading}
              hitSlop={8}
              onPress={onRefreshCaptcha}
              style={[styles.refresh, isCaptchaLoading && styles.refreshBusy]}>
              <RefreshCw size={14} color={theme.primary} />
              <Text style={[styles.refreshLabel, { color: theme.primary }]}>Làm mới</Text>
            </Pressable>
          </View>
          <Image
            source={{ uri: captcha.imageDataUrl }}
            accessibilityLabel="CAPTCHA hiển thị một phép tính cần giải"
            contentFit="contain"
            style={[styles.captchaImage, { borderColor: theme.border, backgroundColor: theme.card }]}
          />
          <Controller
            control={control}
            name="captchaAnswer"
            render={({ field, fieldState }) => (
              <TextField
                label="Đáp án"
                value={field.value ?? ''}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                placeholder="Nhập kết quả phép tính"
                keyboardType="number-pad"
                autoComplete="off"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
            )}
          />
        </View>
      ) : null}

      {authNotice ? (
        <AlertBanner title="Trạng thái tài khoản" description={authNotice}>
          {requiresVerification ? (
            <View style={styles.noticeAction}>
              <Button
                variant="outline"
                label={isResending ? 'Đang gửi…' : 'Gửi lại email xác minh'}
                loading={isResending}
                onPress={onResendVerification}
              />
            </View>
          ) : null}
        </AlertBanner>
      ) : null}

      {lockSeconds > 0 ? (
        <AlertBanner
          variant="destructive"
          title="Tài khoản tạm thời bị khóa"
          description={`Thử lại sau ${formatLockCountdown(lockSeconds)}.`}
        />
      ) : null}

      <Button label="Đăng nhập" loading={isLoading} disabled={lockSeconds > 0} onPress={submit} />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  support: { fontFamily: FontFamily.regular, fontSize: 12, textAlign: 'center' },
  linkTarget: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: FontFamily.medium, fontSize: 13 },
  captcha: { gap: 12 },
  captchaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  captchaLabel: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    letterSpacing: 0.77,
    textTransform: 'uppercase',
  },
  refresh: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  refreshBusy: { opacity: 0.5 },
  refreshLabel: { fontFamily: FontFamily.medium, fontSize: 13 },
  captchaImage: { width: 220, height: 72, maxWidth: '100%', borderWidth: 1, borderRadius: Radius.md },
  noticeAction: { alignSelf: 'flex-start', marginTop: 4 },
});

import * as Haptics from 'expo-haptics';
import { Send } from 'lucide-react-native';
import { Controller, type UseFormReturn } from 'react-hook-form';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';

import type { ForgotPasswordFormValues } from '../../auth.schema';
import { AuthHeaderButton, AuthScreenLayout } from '../auth-screen-layout';

interface ForgotPasswordFormProps {
  readonly form: UseFormReturn<ForgotPasswordFormValues>;
  readonly onSubmit: (values: ForgotPasswordFormValues) => void;
  readonly isLoading: boolean;
  readonly submittedEmail?: string;
  readonly onReset: () => void;
  readonly onBackToLogin: () => void;
}

export function ForgotPasswordForm({
  form,
  onSubmit,
  isLoading,
  submittedEmail,
  onReset,
  onBackToLogin,
}: ForgotPasswordFormProps) {
  const submit = form.handleSubmit(onSubmit, () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  });

  return (
    <AuthScreenLayout
      kicker="Khôi phục tài khoản"
      title="Quên mật khẩu"
      headerAction={<AuthHeaderButton label="Đăng nhập" onPress={onBackToLogin} />}>
      {submittedEmail ? (
        <>
          <AlertBanner
            variant="success"
            title="Kiểm tra email của bạn"
            description={`Nếu ${submittedEmail} tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.`}
          />
          <Button label="Quay lại đăng nhập" onPress={onBackToLogin} />
          <Button variant="outline" label="Gửi lại với email khác" onPress={onReset} />
        </>
      ) : (
        <>
          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                label="Email"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                hint="Chúng tôi sẽ gửi hướng dẫn nếu email khớp với tài khoản đang hoạt động."
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={() => void submit()}
              />
            )}
          />
          <Button
            label="Gửi hướng dẫn"
            loading={isLoading}
            renderIcon={(color) => <Send size={16} color={color} />}
            onPress={submit}
          />
          <Button variant="ghost" label="Đã nhớ mật khẩu? Quay lại đăng nhập" onPress={onBackToLogin} />
        </>
      )}
    </AuthScreenLayout>
  );
}

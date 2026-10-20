import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { useRef } from 'react';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View, type TextInput } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { RegisterFormValues } from '../../auth.schema';
import { AuthHeaderButton, AuthScreenLayout } from '../auth-screen-layout';
import { PasswordRequirementList } from '../password-requirement-list';

interface RegisterFormProps {
  readonly form: UseFormReturn<RegisterFormValues>;
  readonly onSubmit: (values: RegisterFormValues) => void;
  readonly isLoading: boolean;
  readonly submittedEmail?: string;
  readonly onBackToLogin: () => void;
}

export function RegisterForm({ form, onSubmit, isLoading, submittedEmail, onBackToLogin }: RegisterFormProps) {
  const theme = useTheme();
  const { control, handleSubmit } = form;
  const password = useWatch({ control, name: 'password' }) ?? '';
  const ownerRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const addressRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const submit = handleSubmit(onSubmit, () => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  });

  return (
    <AuthScreenLayout
      kicker="Hệ thống quản lý kho"
      title="Đăng ký"
      headerAction={<AuthHeaderButton label="Đăng nhập" onPress={onBackToLogin} />}>
      {submittedEmail ? (
        <>
          <AlertBanner
            variant="success"
            title="Đăng ký thành công"
            description={`Vui lòng kiểm tra email ${submittedEmail} để xác minh tài khoản trước khi đăng nhập.`}
          />
          <Button label="Quay lại đăng nhập" onPress={onBackToLogin} />
        </>
      ) : (
        <>
          <Controller
            control={control}
            name="tenantName"
            render={({ field, fieldState }) => (
              <TextField
                label="Tên doanh nghiệp"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                returnKeyType="next"
                onSubmitEditing={() => ownerRef.current?.focus()}
              />
            )}
          />
          <Controller
            control={control}
            name="ownerName"
            render={({ field, fieldState }) => (
              <TextField
                inputRef={ownerRef}
                label="Tên chủ sở hữu"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field, fieldState }) => (
              <TextField
                inputRef={phoneRef}
                label="Số điện thoại"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                inputRef={emailRef}
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
                onSubmitEditing={() => addressRef.current?.focus()}
              />
            )}
          />
          <Controller
            control={control}
            name="address"
            render={({ field, fieldState }) => (
              <TextField
                inputRef={addressRef}
                label="Địa chỉ"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                autoComplete="street-address"
                textContentType="fullStreetAddress"
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
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                onSubmitEditing={() => confirmRef.current?.focus()}
              />
            )}
          />
          <PasswordRequirementList password={password} />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
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
            )}
          />
          <Controller
            control={control}
            name="acceptTerms"
            render={({ field, fieldState }) => (
              <View>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: field.value }}
                  onPress={() => field.onChange(!field.value)}
                  style={styles.terms}>
                  <View
                    style={[
                      styles.box,
                      { borderColor: fieldState.error ? theme.error : theme.border },
                      field.value && { backgroundColor: theme.primary, borderColor: theme.primary },
                    ]}>
                    {field.value ? <Check size={14} color={theme.onPrimary} /> : null}
                  </View>
                  <Text style={[styles.termsLabel, { color: theme.text }]}>Tôi đồng ý với điều khoản dịch vụ</Text>
                </Pressable>
                {fieldState.error ? (
                  <Text style={[styles.error, { color: theme.error }]}>{fieldState.error.message}</Text>
                ) : null}
              </View>
            )}
          />
          <Button label="Đăng ký" loading={isLoading} onPress={submit} />
          <Button variant="ghost" label="Đã có tài khoản? Đăng nhập" onPress={onBackToLogin} />
        </>
      )}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  terms: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsLabel: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14 },
  error: { fontFamily: FontFamily.regular, fontSize: 12 },
});

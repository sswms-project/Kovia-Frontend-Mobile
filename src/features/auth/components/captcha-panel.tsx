import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import type { UseFormReturn } from 'react-hook-form';
import type { LoginInput } from '../auth.schema';
import type { CaptchaChallenge } from '../auth.types';
import { ActionButton, DetailText, Feedback, FormField } from './auth-form';

interface CaptchaPanelProps {
  challenge?: CaptchaChallenge;
  busy: boolean;
  disabled: boolean;
  error: Error | null;
  onRefresh: () => void;
  form: UseFormReturn<LoginInput>;
}
export function CaptchaPanel({
  challenge,
  busy,
  disabled,
  error,
  onRefresh,
  form,
}: CaptchaPanelProps) {
  return (
    <View style={styles.panel}>
      <DetailText>Xác nhận bạn là người dùng. Mã CAPTCHA chỉ dùng một lần.</DetailText>
      {challenge ? (
        <>
          <Image
            source={{ uri: challenge.imageDataUrl }}
            style={styles.image}
            contentFit="contain"
            accessibilityLabel="Ảnh mã CAPTCHA"
            cachePolicy="none"
          />
          <DetailText>
            Mã có hiệu lực {challenge.expiresInSeconds} giây. Nếu hết hạn, hãy lấy mã mới.
          </DetailText>
          <FormField
            form={form}
            name="captchaAnswer"
            label="Mã CAPTCHA"
            maxLength={20}
            editable={!disabled && !busy}
          />
        </>
      ) : null}
      <Feedback error={error} />
      <ActionButton
        label="Lấy mã CAPTCHA mới"
        secondary
        busy={busy}
        disabled={disabled}
        onPress={onRefresh}
      />
    </View>
  );
}
const styles = StyleSheet.create({ panel: { gap: 12 }, image: { width: '100%', height: 100 } });

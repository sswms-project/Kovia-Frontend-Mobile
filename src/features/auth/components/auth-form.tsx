import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Controller, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KoviaLogo } from '@/components/kovia-logo';
import { useTheme } from '@/hooks/use-theme';

interface AuthFrameProps {
  title: string;
  description?: string;
  backLabel?: string;
  onBack?: () => void;
  children: ReactNode;
}
export function AuthFrame({ title, description, backLabel, onBack, children }: AuthFrameProps) {
  const colors = useTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <View style={styles.content}>
            {onBack ? (
              <Pressable accessibilityRole="button" accessibilityLabel={backLabel ?? 'Quay lại'} hitSlop={8}
                onPress={onBack} style={styles.back}>
                <ChevronLeft size={22} color={colors.primary} />
                <Text style={[styles.backText, { color: colors.primary }]}>{backLabel ?? 'Quay lại'}</Text>
              </Pressable>
            ) : null}
            <KoviaLogo />
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
              {title}
            </Text>
            {description ? (
              <Text style={[styles.body, { color: colors.textSecondary }]}>{description}</Text>
            ) : null}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
interface FormFieldProps<T extends FieldValues> extends Omit<
  TextInputProps,
  'value' | 'onChangeText'
> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
}
export function FormField<T extends FieldValues>({
  form,
  name,
  label,
  ...props
}: FormFieldProps<T>) {
  const colors = useTheme();
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            {...props}
            accessibilityLabel={label}
            ref={field.ref}
            value={String(field.value ?? '')}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: fieldState.error ? colors.error : colors.textSecondary,
                backgroundColor: colors.backgroundElement,
              },
            ]}
          />
          {fieldState.error ? (
            <Text accessibilityRole="alert" style={[styles.body, { color: colors.error }]}>
              {fieldState.error.message}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}
interface ActionButtonProps {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
}
export function ActionButton({
  label,
  onPress,
  busy = false,
  disabled = false,
  secondary = false,
}: ActionButtonProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: secondary ? colors.backgroundElement : colors.text },
        (pressed || disabled || busy) && styles.dimmed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.text : colors.background} />
      ) : (
        <Text style={[styles.label, { color: secondary ? colors.text : colors.background }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
export function Feedback({ error, message }: { error?: Error | null; message?: string }) {
  const colors = useTheme();
  const content = error?.message ?? message;
  return content ? (
    <Text
      accessibilityRole={error ? 'alert' : undefined}
      accessibilityLiveRegion="polite"
      style={[styles.body, { color: error ? colors.error : colors.text }]}
    >
      {content}
    </Text>
  ) : null;
}
export function DetailText({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return (
    <Text selectable style={[styles.body, { color: colors.textSecondary }]}>
      {children}
    </Text>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingBottom: 100 },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 16 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginLeft: -4 },
  backText: { fontSize: 16, fontWeight: '600' },
  brand: { fontSize: 13, fontWeight: '700', letterSpacing: 2, marginTop: 16 },
  title: { fontSize: 28, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24 },
  label: { fontSize: 16, fontWeight: '600' },
  field: { gap: 8 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  button: {
    minHeight: 52,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.55 },
});

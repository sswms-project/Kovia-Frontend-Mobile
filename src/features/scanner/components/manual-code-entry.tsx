import { Controller, type UseFormReturn } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';

import type { ManualCodeFormValues } from '../scanner.schema';

interface ManualCodeEntryProps {
  readonly form: UseFormReturn<ManualCodeFormValues>;
  readonly onSubmit: (values: ManualCodeFormValues) => void;
  readonly isBusy: boolean;
}

/** Fallback for damaged labels or a denied camera permission. */
export function ManualCodeEntry({ form, onSubmit, isBusy }: ManualCodeEntryProps) {
  const submit = form.handleSubmit(onSubmit);

  return (
    <View style={styles.container}>
      <Controller
        control={form.control}
        name="code"
        render={({ field, fieldState }) => (
          <TextField
            label="Nhập mã thủ công"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            placeholder="Gõ mã in trên nhãn"
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            returnKeyType="done"
            editable={!isBusy}
            onSubmitEditing={() => void submit()}
          />
        )}
      />
      <Button label="Xác nhận mã" loading={isBusy} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { gap: 12 } });

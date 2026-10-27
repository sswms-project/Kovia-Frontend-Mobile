import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';

import { createForecastRunFormSchema, type CreateForecastRunFormValues } from '../forecast.schema';

interface ForecastRunFormProps {
  readonly isSubmitting: boolean;
  readonly onSubmit: (values: { historicalPeriodDays: number; horizonDays: number }) => void;
}

const FIELDS = [
  { name: 'historicalPeriodDays', label: 'Số ngày dữ liệu lịch sử' },
  { name: 'horizonDays', label: 'Số ngày dự báo' },
] as const;

export function ForecastRunForm({ isSubmitting, onSubmit }: ForecastRunFormProps) {
  const form = useForm<CreateForecastRunFormValues>({
    resolver: zodResolver(createForecastRunFormSchema),
    defaultValues: { historicalPeriodDays: '90', horizonDays: '14' },
  });
  const { errors } = form.formState;
  return (
    <View style={styles.form}>
      {FIELDS.map(({ name, label }) => (
        <Controller key={name} control={form.control} name={name} render={({ field }) => (
          <TextField label={label} keyboardType="number-pad" value={String(field.value ?? '')}
            onChangeText={field.onChange} onBlur={field.onBlur} error={errors[name]?.message} />)} />
      ))}
      <Button label="Chạy dự báo" loading={isSubmitting}
        onPress={() => { void form.handleSubmit((values) => onSubmit(createForecastRunFormSchema.parse(values)))(); }} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 12 } });

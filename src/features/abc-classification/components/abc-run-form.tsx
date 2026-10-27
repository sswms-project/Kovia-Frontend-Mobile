import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { SelectionField } from '@/components/ui/selection-field';
import { TextField } from '@/components/ui/text-field';

import { ABC_METRIC_LABELS } from '../abc-classification.labels';
import { abcMetricSchema, runAbcFormSchema, type RunAbcFormValues } from '../abc-classification.schema';
import { ABC_METRICS, type AbcMetric } from '../abc-classification.types';

interface AbcRunFormProps {
  readonly isSubmitting: boolean;
  readonly onSubmit: (values: { historicalPeriodDays: number; metric: AbcMetric; aThreshold: number; bThreshold: number }) => void;
}

const METRIC_OPTIONS = ABC_METRICS.map((metric) => ({ value: metric, label: ABC_METRIC_LABELS[metric] }));
const NUMBER_FIELDS = [
  { name: 'historicalPeriodDays', label: 'Số ngày phân tích' },
  { name: 'aThreshold', label: 'Ngưỡng A (%)' },
  { name: 'bThreshold', label: 'Ngưỡng B (%)' },
] as const;

export function AbcRunForm({ isSubmitting, onSubmit }: AbcRunFormProps) {
  const form = useForm<RunAbcFormValues>({
    resolver: zodResolver(runAbcFormSchema),
    defaultValues: { historicalPeriodDays: '90', metric: 'Quantity', aThreshold: '80', bThreshold: '95' },
  });
  const { errors } = form.formState;
  return (
    <View style={styles.form}>
      <Controller control={form.control} name="metric" render={({ field }) => (
        <SelectionField label="Tiêu chí" value={field.value} options={METRIC_OPTIONS}
          onChange={(value) => field.onChange(abcMetricSchema.parse(value))} />)} />
      {NUMBER_FIELDS.map(({ name, label }) => (
        <Controller key={name} control={form.control} name={name} render={({ field }) => (
          <TextField label={label} keyboardType="number-pad" value={String(field.value ?? '')}
            onChangeText={field.onChange} onBlur={field.onBlur} error={errors[name]?.message} />)} />
      ))}
      <Button label="Chạy phân loại" loading={isSubmitting}
        onPress={() => { void form.handleSubmit((values) => onSubmit(runAbcFormSchema.parse(values)))(); }} />
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: 12 } });

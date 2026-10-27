import type { AbcClass, AbcMetric } from './abc-classification.types';

export const ABC_METRIC_LABELS: Record<AbcMetric, string> = { Quantity: 'Theo số lượng xuất', Activity: 'Theo số lần xuất' };
export const ABC_CLASS_TONES: Record<AbcClass, 'danger' | 'warning' | 'neutral'> = { A: 'danger', B: 'warning', C: 'neutral' };
export const ABC_CLASS_HINTS: Record<AbcClass, string> = { A: 'Quan trọng nhất', B: 'Trung bình', C: 'Ít quan trọng' };

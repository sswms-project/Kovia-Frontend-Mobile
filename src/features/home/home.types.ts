import type { LucideIcon } from 'lucide-react-native';

export type Tone = 'primary' | 'neutral' | 'danger';

export type HomeKpi = {
  id: string;
  label: string;
  value: string;
  unit: string;
  icon: LucideIcon;
  tone: Tone;
  // Phụ chú: chip hoặc thanh tiến độ
  chip?: { text: string; tone: Tone };
  progress?: number;
};

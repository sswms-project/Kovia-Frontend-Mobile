import type { LucideIcon } from 'lucide-react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';

interface TabPlaceholderProps {
  /** Result of the screen's `useCan` check; a UI hint only, the BE still enforces access. */
  readonly allowed: boolean;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}

// Stands in for each tab until its feature task lands, so the shell can ship and be navigated.
export function TabPlaceholder({
  allowed,
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: TabPlaceholderProps) {
  if (!allowed) return <ErrorState kind="forbidden" fullScreen />;

  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
      fullScreen
    />
  );
}

import { View, StyleSheet } from 'react-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { SelectionField } from '@/components/ui/selection-field';

import type { useNotificationNavigation } from '../hooks/use-notification-navigation';

type Navigation = ReturnType<typeof useNotificationNavigation>;
export function NotificationTaskChoices({ navigation }: { readonly navigation: Navigation }) {
  if (!navigation.choices.length) return null;
  return <View style={styles.root}>
    <AlertBanner title="Phiếu có nhiều công việc tại kho đang chọn. Chọn đúng đợt để mở." />
    <SelectionField label="Công việc liên quan" value="" options={navigation.choices.map(({ task, history }, index) => ({
      value: String(index), label: `${task.referenceCode} · ${task.title}`, description: `${task.workSummary}${history ? ' · Lịch sử' : ''}`,
    }))} onChange={navigation.pick} />
    <Button label="Đóng lựa chọn" variant="ghost" onPress={navigation.cancel} />
  </View>;
}
const styles = StyleSheet.create({ root: { gap: 12 } });

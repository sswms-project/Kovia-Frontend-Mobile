import { View, StyleSheet } from 'react-native';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { useScreenExit } from '@/hooks/use-screen-exit';

export function WorkCompletionActions({ visible, message = 'Đã hoàn tất công việc.' }: { readonly visible: boolean; readonly message?: string }) {
  const exit = useScreenExit();
  if (!visible || !exit) return null;
  return <View style={styles.group}>
    <AlertBanner title={message} />
    <Button label="Về công việc" variant="outline" disabled={exit.leaving} onPress={exit.tasks} />
    <Button label="Trang chủ" disabled={exit.leaving} onPress={exit.home} />
  </View>;
}
const styles = StyleSheet.create({ group: { gap: 8 } });

import { Tabs, TabList, TabTrigger, TabSlot } from 'expo-router/ui';
import { StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabList style={styles.tabs}>
        <ThemedView style={styles.brand}><ThemedText type="smallBold">Kovia</ThemedText></ThemedView>
        <TabTrigger name="home" href="/" style={styles.tab}><ThemedText>Kho làm việc</ThemedText></TabTrigger>
        <TabTrigger name="tasks" href="/tasks" style={styles.tab}><ThemedText>Công việc</ThemedText></TabTrigger>
        <TabTrigger name="lookup" href="/lookup" style={styles.tab}><ThemedText>Tra cứu</ThemedText></TabTrigger>
        <TabTrigger name="profile" href="/profile" style={styles.tab}><ThemedText>Hồ sơ</ThemedText></TabTrigger>
      </TabList>
      <TabSlot style={styles.content} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.two, flexWrap: 'wrap' },
  brand: { marginRight: 'auto', padding: Spacing.two },
  tab: { minHeight: 44, padding: Spacing.two, justifyContent: 'center' },
  content: { flex: 1 },
});

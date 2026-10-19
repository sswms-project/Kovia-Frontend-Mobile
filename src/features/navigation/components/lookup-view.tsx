import { ChevronRight, Package, Search, type LucideIcon } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface LookupEntry {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly onPress: () => void;
}

// Each lookup screen registers its icon here; unknown keys fall back to the generic search icon.
const ENTRY_ICONS: Record<string, LucideIcon> = { products: Package };

interface LookupViewProps {
  readonly entries: readonly LookupEntry[];
}

export function LookupView({ entries }: LookupViewProps) {
  const theme = useTheme();

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: theme.background }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        Tra cứu
      </Text>

      {entries.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Chưa có mục tra cứu"
          description="Tài khoản của bạn chưa được cấp quyền xem danh mục nào."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {entries.map((entry) => {
            const Icon = ENTRY_ICONS[entry.key] ?? Search;
            return (
              <Pressable
                key={entry.key}
                accessibilityRole="button"
                accessibilityLabel={`${entry.title}. ${entry.description}`}
                onPress={entry.onPress}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.iconBox, { backgroundColor: theme.secondaryContainer }]}>
                  <Icon size={22} color={theme.primary} />
                </View>
                <View style={styles.text}>
                  <Text style={[styles.entryTitle, { color: theme.text }]}>{entry.title}</Text>
                  <Text style={[styles.description, { color: theme.textSecondary }]}>{entry.description}</Text>
                </View>
                <ChevronRight size={20} color={theme.textSecondary} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 12, paddingTop: 12 },
  title: { fontFamily: FontFamily.semibold, fontSize: 26, lineHeight: 32, paddingHorizontal: 20 },
  list: { gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  card: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: Radius.xl,
  },
  pressed: { opacity: 0.85 },
  iconBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.lg },
  text: { flex: 1, gap: 2 },
  entryTitle: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 22 },
  description: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
});

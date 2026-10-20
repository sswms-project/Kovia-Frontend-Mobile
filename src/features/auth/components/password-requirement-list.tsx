import { CheckCircle2, Circle } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { passwordRequirements } from '../auth.schema';

interface PasswordRequirementListProps {
  readonly password: string;
}

export function PasswordRequirementList({ password }: PasswordRequirementListProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.container, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <Text style={[styles.heading, { color: theme.text }]}>Mật khẩu cần đáp ứng:</Text>
      {passwordRequirements.map((requirement) => {
        const isMet = requirement.validate(password);
        const Icon = isMet ? CheckCircle2 : Circle;
        const color = isMet ? theme.primary : theme.textSecondary;

        return (
          <View
            key={requirement.id}
            accessible
            accessibilityLabel={`${requirement.label}: ${isMet ? 'đã đạt' : 'chưa đạt'}`}
            style={styles.row}>
            <Icon size={14} color={color} />
            <Text style={[styles.label, { color }]}>{requirement.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, padding: 12, borderWidth: 1, borderRadius: Radius.md },
  heading: { fontFamily: FontFamily.semibold, fontSize: 12, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16 },
});

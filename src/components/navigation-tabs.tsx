import { Tabs } from 'expo-router';
import { ClipboardList, House, PackageSearch, ScanLine, UserRound } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MOBILE_TABS } from '@/config/mobile-navigation';
import { isFieldWorkspace } from '@/config/mobile-workspace';
import { USER_ROLES } from '@/config/roles';
import { useMe } from '@/features/auth/hooks/use-me';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TAB_ICONS = { index: House, tasks: ClipboardList, scanner: ScanLine, inventory: PackageSearch, profile: UserRound, catalog: PackageSearch };

export function KoviaTabs({ allowedTabNames }: { readonly allowedTabNames: readonly string[] }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const role = useMe().data?.role;
  const owner = !isFieldWorkspace(role);
  const tabs = owner
    ? ['index', 'catalog', 'scanner', 'inventory', 'profile'].map((name) => MOBILE_TABS.find((tab) => tab.name === name)!)
      .concat(MOBILE_TABS.filter((tab) => tab.name === 'tasks'))
    : MOBILE_TABS;
  const bottom = Math.max(insets.bottom, 8);
  return <Tabs backBehavior="history" screenOptions={{
    headerShown: false,
    tabBarHideOnKeyboard: true,
    tabBarActiveTintColor: theme.primary,
    tabBarInactiveTintColor: theme.textSecondary,
    tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border, height: 72 + bottom, paddingTop: 8, paddingBottom: bottom },
    tabBarLabelStyle: { fontFamily: FontFamily.medium, fontSize: 11, lineHeight: 16, marginTop: 4 },
    tabBarItemStyle: { minHeight: 56 },
  }}>
    <Tabs.Screen name="lookup" options={{ href: null }} />
    {tabs.map((tab) => {
      const Icon = TAB_ICONS[tab.name];
      const scanner = tab.name === 'scanner';
      return <Tabs.Screen key={tab.name} name={tab.name} options={{
        title: owner && tab.name === 'catalog' ? role === USER_ROLES.TenantOwner ? 'Quản lý' : 'Theo dõi' : owner && tab.name === 'index' ? 'Tổng quan' : tab.title,
        href: (owner ? tab.name !== 'tasks' : tab.inNavbar) && (allowedTabNames.includes(tab.name) || 'showWithoutPermission' in tab) ? undefined : null,
        tabBarAccessibilityLabel: scanner ? 'Quét mã, mở tra cứu bằng camera hoặc nhập mã' : tab.title,
        tabBarIcon: ({ color, focused }) => scanner
          ? <View style={[styles.scan, { backgroundColor: theme.primary, borderColor: theme.card, shadowColor: theme.primary }, focused && { borderColor: theme.secondaryContainer }]}>
            <ScanLine size={28} color={theme.onPrimary} strokeWidth={2.2} />
          </View>
          : <Icon size={23} color={color} strokeWidth={focused ? 2.2 : 1.8} />,
        ...(scanner ? { tabBarIconStyle: styles.scanSlot, tabBarLabelStyle: { fontFamily: FontFamily.bold, fontSize: 12, lineHeight: 16, color: theme.primary, marginTop: 4 } } : {}),
      }} />;
    })}
  </Tabs>;
}

const styles = StyleSheet.create({
  scanSlot: { height: 32, marginTop: -4 },
  scan: { width: 58, height: 58, borderRadius: 29, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginTop: -14,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 },
});

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { MOBILE_TABS } from '@/config/mobile-navigation';
import { useTheme } from '@/hooks/use-theme';

interface AppTabsProps {
  readonly allowedTabNames: readonly string[];
}

export default function AppTabs({ allowedTabNames }: AppTabsProps) {
  const theme = useTheme();

  return (
    <NativeTabs
      backgroundColor={theme.background}
      indicatorColor={theme.backgroundSelected}
      tintColor={theme.primary}
      labelStyle={{ selected: { color: theme.primary } }}>
      <NativeTabs.Trigger name="lookup" hidden />
      {MOBILE_TABS.map((tab) => (
        <NativeTabs.Trigger
          key={tab.name}
          name={tab.name}
          hidden={!allowedTabNames.includes(tab.name)}>
          <NativeTabs.Trigger.Label>{tab.title}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.icon.sf} md={tab.icon.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}

import { useRouter } from 'expo-router';

import { LOOKUP_ENTRIES } from '@/config/mobile-navigation';
import { hasPermission } from '@/features/auth/auth.permissions';
import { useMe } from '@/features/auth/hooks/use-me';

import { LookupView, type LookupEntry } from '../components/lookup-view';

export function LookupScreen() {
  const router = useRouter();
  const me = useMe();

  // Only entries the user may open are listed; the BE still enforces each screen's own permission.
  const entries: readonly LookupEntry[] = me.data
    ? LOOKUP_ENTRIES.filter((entry) => hasPermission(me.data, entry.permission)).map((entry) => ({
        key: entry.key,
        title: entry.title,
        description: entry.description,
        onPress: () => router.push(entry.href),
      }))
    : [];

  return <LookupView entries={entries} />;
}

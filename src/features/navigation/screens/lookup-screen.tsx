import { useRouter } from 'expo-router';

import { LOOKUP_ENTRIES } from '@/config/mobile-navigation';
import { hasPermission } from '@/features/auth/auth.permissions';
import { useMe } from '@/features/auth/hooks/use-me';
import { USER_ROLES } from '@/config/roles';
import { isFieldWorkspace, isMobileEntryVisible } from '@/config/mobile-workspace';

import { LookupView, type LookupEntry } from '../components/lookup-view';

export function LookupScreen() {
  const router = useRouter();
  const me = useMe();
  const owner = !isFieldWorkspace(me.data?.role);
  const groups = [
    { title: owner ? 'Báo cáo & theo dõi' : 'Báo cáo hiện trường', keys: ['warehouse-monitor', 'discrepancies', 'damage-cases', 'audit-logs', 'reports'] },
    { title: 'Chứng từ kho', keys: ['inbound-requests', 'stock-issue-requests', 'goods-returns', 'stock-adjustments'] },
    { title: 'Vật tư hàng hóa', keys: ['products', 'categories', 'units'] },
    { title: 'Đối tượng & kho', keys: ['suppliers', 'stock-recipients', 'warehouses'] },
  ];

  // Only entries the user may open are listed; the BE still enforces each screen's own permission.
  const entries: readonly LookupEntry[] = me.data && !me.isError
    ? LOOKUP_ENTRIES.filter((entry) => hasPermission(me.data, entry.permission) && isMobileEntryVisible(entry.key, me.data.role)).map((entry) => ({
        key: entry.key,
        title: entry.key === 'audit-logs' && me.data.role === USER_ROLES.WarehouseStaff ? 'Hoạt động của tôi' : entry.title,
        description: entry.description,
        onPress: () => router.push(entry.href),
      }))
    : [];

  const grouped = groups.flatMap((group) => group.keys.flatMap((key) => {
    const entry = entries.find((item) => item.key === key);
    return entry ? [{ ...entry, group: group.title }] : [];
  }));
  return <LookupView entries={grouped} owner={owner} title={me.data?.role === USER_ROLES.WarehouseManager ? 'Theo dõi nhanh' : undefined} refreshing={me.isFetching}
    refreshFailed={me.isError} onRefresh={() => { void me.refetch(); }} />;
}

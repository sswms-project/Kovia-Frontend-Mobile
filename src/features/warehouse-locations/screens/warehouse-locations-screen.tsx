import { router } from 'expo-router';
import { ArrowLeft, MapPin, Search } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { WarehouseMap, type MapSelection } from '../components/warehouse-map';
import { useLayoutScene, useLocationSearch } from '../hooks/use-locations';
import type { LocationItem, LocationType } from '../warehouse-locations.types';

type Mode = 'map' | 'search';
const TYPES: { value: LocationType | undefined; label: string }[] = [
  { value: undefined, label: 'Tất cả' }, { value: 'Zone', label: 'Khu' },
  { value: 'Rack', label: 'Kệ' }, { value: 'Slot', label: 'Ô' },
];
const OCCUPANCY: Record<string, string> = { Vacant: 'Trống', Occupied: 'Đang chứa', Reserved: 'Đã giữ chỗ', Full: 'Đầy' };

export function WarehouseLocationsScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<Mode>('map');
  const [text, setText] = useState('');
  const [type, setType] = useState<LocationType | undefined>();
  const [selected, setSelected] = useState<MapSelection | null>(null);
  const scene = useLayoutScene();
  const search = useLocationSearch({ searchText: text, type });
  const canView = scene.canView;

  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} accessibilityLabel="Quay lại" hitSlop={12}>
        <ArrowLeft size={22} color={theme.text} />
      </Pressable>
      <Text style={[styles.title, { color: theme.text }]}>Sơ đồ & vị trí kho</Text>
    </View>
  );
  if (!canView)
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        {header}
        <View style={styles.pad}>
          <AlertBanner title="Bạn chưa được cấp quyền xem sơ đồ kho hoặc chưa chọn kho làm việc." />
        </View>
      </SafeAreaView>
    );

  const tabs = (
    <View style={styles.row}>
      {(['map', 'search'] as const).map((m) => (
        <Text key={m} onPress={() => setMode(m)} accessibilityRole="tab"
          style={[styles.chip, { color: mode === m ? theme.onPrimary : theme.text,
            backgroundColor: mode === m ? theme.primary : theme.backgroundElement }]}>
          {m === 'map' ? 'Sơ đồ' : 'Tìm vị trí'}
        </Text>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      {header}
      <View style={styles.pad}>{tabs}</View>
      {mode === 'map' ? (
        scene.query.isPending ? <LoadingState message="Đang tải sơ đồ kho…" />
          : scene.query.isError ? <ErrorState error={scene.query.error} onRetry={() => void scene.query.refetch()} />
            : !scene.query.data || scene.query.data.zones.length === 0
              ? <EmptyState icon={MapPin} title="Kho chưa có sơ đồ" description="Quản lý kho chưa thiết kế sơ đồ cho kho này." />
              : (
                <View style={styles.pad}>
                  <WarehouseMap scene={scene.query.data} selectedId={selected?.id} onSelect={setSelected} />
                  {selected ? (
                    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Text style={[styles.cardTitle, { color: theme.text }]}>
                        {selected.kind === 'zone' ? 'Khu' : 'Kệ'} {selected.code}
                      </Text>
                      {selected.name ? <Text style={{ color: theme.textSecondary }}>{selected.name}</Text> : null}
                      <Text style={styles.link} onPress={() => { setText(selected.code); setMode('search'); }}>
                        Xem ô chứa hàng trong danh sách →
                      </Text>
                    </View>
                  ) : null}
                </View>
              )
      ) : (
        <FlatList<LocationItem>
          data={search.query.data?.items ?? []}
          keyExtractor={(i) => `${i.type}:${i.id}`}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={search.query.isRefetching} onRefresh={() => void search.query.refetch()} />}
          ListHeaderComponent={
            <View style={{ gap: 8 }}>
              <TextField label="Tìm theo mã hoặc tên" value={text} onChangeText={setText} autoCapitalize="characters"
                returnKeyType="search" placeholder="VD: A-01-02" />
              <View style={styles.row}>
                {TYPES.map((t) => (
                  <Text key={t.label} onPress={() => setType(t.value)}
                    style={[styles.chip, { color: type === t.value ? theme.onPrimary : theme.text,
                      backgroundColor: type === t.value ? theme.primary : theme.backgroundElement }]}>{t.label}</Text>
                ))}
              </View>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{item.code}</Text>
              <Text style={{ color: theme.textSecondary, fontFamily: FontFamily.regular }}>
                {[item.type === 'Zone' ? 'Khu' : item.type === 'Rack' ? 'Kệ' : 'Ô', item.name,
                  item.zoneCode && `Khu ${item.zoneCode}`, item.rackCode && `Kệ ${item.rackCode}`].filter(Boolean).join(' · ')}
              </Text>
              {item.occupancyStatus || item.capacity != null ? (
                <Text style={{ color: theme.text, fontFamily: FontFamily.medium }}>
                  {item.occupancyStatus ? OCCUPANCY[item.occupancyStatus] ?? item.occupancyStatus : ''}
                  {item.capacity != null ? ` · ${item.currentOccupancy ?? 0}/${item.capacity}` : ''}
                </Text>
              ) : null}
            </View>
          )}
          ListEmptyComponent={
            search.query.isPending ? <LoadingState message="Đang tìm…" />
              : search.query.isError ? <ErrorState error={search.query.error} onRetry={() => void search.query.refetch()} />
                : <EmptyState icon={Search} title="Không tìm thấy vị trí" description="Thử mã hoặc bộ lọc khác." />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontFamily: FontFamily.bold },
  pad: { paddingHorizontal: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', fontSize: 13, fontFamily: FontFamily.medium },
  list: { padding: 16, paddingTop: 4, gap: 8, flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: 8, padding: 12, gap: 4, marginTop: 12 },
  cardTitle: { fontSize: 15, fontFamily: FontFamily.semibold },
  link: { color: '#2563eb', fontFamily: FontFamily.medium, marginTop: 4 },
});

import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import type { LayoutScene } from '../warehouse-locations.types';

const VACANT = '#16a34a';
const PARTIAL = '#f59e0b';
const FULL = '#dc2626';
const ZOOMS = [0.75, 1, 1.5, 2.5];

export interface MapSelection {
  readonly kind: 'zone' | 'rack';
  readonly id: string;
  readonly code: string;
  readonly name?: string;
}

interface Props {
  readonly scene: LayoutScene;
  readonly onSelect: (selection: MapSelection) => void;
  readonly selectedId?: string;
}

export function WarehouseMap({ scene, onSelect, selectedId }: Props) {
  const theme = useTheme();
  const [zoom, setZoom] = useState(1);
  const { width, height } = scene.canvas;
  const slotsByRack = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of scene.slots) map.set(s.rackId, [...(map.get(s.rackId) ?? []), s.occupancyStatus ?? 'Vacant']);
    return map;
  }, [scene.slots]);
  const scale = (340 / Math.max(width, 1)) * zoom;
  return (
    <View>
      <View style={styles.zoomRow}>
        {ZOOMS.map((z) => (
          <Text key={z} onPress={() => setZoom(z)} accessibilityRole="button"
            style={[styles.chip, { color: zoom === z ? theme.onPrimary : theme.text,
              backgroundColor: zoom === z ? theme.primary : theme.backgroundElement }]}>{`${Math.round(z * 100)}%`}</Text>
        ))}
      </View>
      <ScrollView horizontal nestedScrollEnabled>
        <ScrollView nestedScrollEnabled>
          <Svg width={width * scale} height={height * scale} viewBox={`0 0 ${width} ${height}`}>
            <Rect x={0} y={0} width={width} height={height} fill={theme.backgroundElement} />
            {scene.zones.map((z) => (
              <G key={z.id} onPress={() => onSelect({ kind: 'zone', id: z.id, code: z.zoneCode, name: z.zoneName })}>
                <Rect x={z.x} y={z.y} width={z.width} height={z.height} rx={6}
                  fill={z.color ?? theme.primaryContainer} fillOpacity={0.35}
                  stroke={selectedId === z.id ? theme.primary : theme.border} strokeWidth={selectedId === z.id ? 4 : 1.5} />
                <SvgText x={z.x + 8} y={z.y + 18} fontSize={14} fill={theme.textSecondary}>{z.zoneCode}</SvgText>
              </G>
            ))}
            {scene.decorations.map((d) => (
              <G key={d.id}>
                <Rect x={d.x} y={d.y} width={d.width} height={d.height} fill={d.color ?? theme.muted} fillOpacity={0.5} />
                {d.label ? <SvgText x={d.x + 4} y={d.y + 14} fontSize={11} fill={theme.textSecondary}>{d.label}</SvgText> : null}
              </G>
            ))}
            {scene.racks.map((r) => {
              const slots = slotsByRack.get(r.id) ?? [];
              const used = slots.filter((s) => s !== 'Vacant').length;
              const ratio = slots.length ? used / slots.length : r.capacity ? (r.currentOccupancy ?? 0) / r.capacity : 0;
              const fill = ratio >= 1 ? FULL : ratio > 0 ? PARTIAL : VACANT;
              return (
                <G key={r.id} onPress={() => onSelect({ kind: 'rack', id: r.id, code: r.rackCode, name: r.rackName })}>
                  <Rect x={r.x} y={r.y} width={r.width} height={r.height} rx={3} fill={fill} fillOpacity={0.75}
                    stroke={selectedId === r.id ? theme.primary : '#00000033'} strokeWidth={selectedId === r.id ? 4 : 1} />
                  <SvgText x={r.x + 3} y={r.y + Math.min(r.height - 3, 13)} fontSize={Math.max(6, Math.min(11, r.height - 4))} fill="#fff">
                    {r.rackCode}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      </ScrollView>
      <View style={styles.legend}>
        {[['Trống', VACANT], ['Một phần', PARTIAL], ['Đầy', FULL]].map(([label, color]) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zoomRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, overflow: 'hidden', fontSize: 12, fontFamily: FontFamily.medium },
  legend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontFamily: FontFamily.regular },
});

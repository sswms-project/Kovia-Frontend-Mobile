import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { locateMapSlot, mapFocus, placedRack, type WarehouseMap } from '../warehouse-map';

interface Props {
  readonly visible: boolean; readonly title: string; readonly slotId: string; readonly scene: WarehouseMap | null;
  readonly loading: boolean; readonly error: string | null; readonly onClose: () => void; readonly onRefresh: () => void;
}

export function WarehouseMapView({ visible, title, slotId, scene, loading, error, onClose, onRefresh }: Props) {
  const theme = useTheme();
  const [overview, setOverview] = useState(false);
  const target = scene ? locateMapSlot(scene, slotId) : null;
  const rack = target && placedRack(target.rack) ? target.rack : null;
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>Vị trí trên sơ đồ</Text>
        <Button label="Đóng sơ đồ" variant="outline" onPress={onClose} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        {loading && <ActivityIndicator accessibilityLabel="Đang tải sơ đồ kho" color={theme.primary} />}
        {error && <AlertBanner variant="destructive" title={error} />}
        {scene && <>
          <Text selectable style={[styles.path, { color: theme.primary }]}>{target?.path ?? 'Không xác định được vị trí này trên sơ đồ hiện tại.'}</Text>
          {!rack && <AlertBanner title={target ? 'Kệ chưa được đặt lên sơ đồ.' : 'Vị trí đã đổi, ngừng hoạt động hoặc chưa có trên sơ đồ.'}
            description="Kiểm tra mã vị trí trên phiếu và tải lại dữ liệu. Không tự chọn một nguồn hàng khác." />}
          <View style={[styles.map, { borderColor: theme.border }]} accessible accessibilityRole="image"
            accessibilityLabel={rack ? `Kệ cần tìm: ${target?.path}. Vị trí được đánh dấu bằng viền và nhãn CẦN TÌM.` : 'Sơ đồ tổng quan kho; chưa xác định được kệ cần tìm.'}>
            <Svg width="100%" height={320} viewBox={mapFocus(scene, overview ? null : rack)}>
              <Rect x={0} y={0} width={scene.canvas.width} height={scene.canvas.height} fill={theme.card} />
              {scene.decorations.filter(item => item.type === 'Aisle').map(item =>
                <Rect key={item.id} x={item.x} y={item.y} width={item.width} height={item.height}
                  transform={`rotate(${item.rotation} ${item.x + item.width / 2} ${item.y + item.height / 2})`}
                  fill={theme.background} stroke={theme.border} strokeDasharray="4 4" />)}
              {scene.racks.filter(placedRack).sort((a, b) => a.zIndex - b.zIndex).map(item => {
                const selected = item.id === rack?.id;
                return <G key={item.id} transform={`rotate(${item.rotation} ${item.x + item.width / 2} ${item.y + item.height / 2})`}>
                  <Rect x={item.x} y={item.y} width={item.width} height={item.height}
                    fill={theme.background} stroke={selected ? theme.primary : theme.border} strokeWidth={selected ? 4 : 1} />
                  <SvgText x={item.x + item.width / 2} y={item.y + item.height / 2} textAnchor="middle"
                    fontSize={Math.max(1, Math.min(16, item.width / Math.max(6, (selected ? 7 : item.rackCode.length) * 0.75)))}
                    fill={selected ? theme.primary : theme.text}>
                    {selected ? 'CẦN TÌM' : item.rackCode}
                  </SvgText>
                </G>;
              })}
            </Svg>
          </View>
          {rack && <Button label={overview ? 'Tập trung kệ cần tìm' : 'Xem toàn kho'} variant="outline" onPress={() => setOverview(value => !value)} />}
          <Text style={[styles.text, { color: theme.textSecondary }]}>Sơ đồ đánh dấu kệ chứa ô cần tìm. Hãy đối chiếu mã ô và quét mã khi lấy hàng; sơ đồ không xác định vị trí hiện tại của bạn hoặc tuyến di chuyển.</Text>
        </>}
        <Button label="Tải lại sơ đồ" variant="outline" loading={loading} onPress={onRefresh} />
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, header: { padding: 16, gap: 12 }, content: { padding: 16, gap: 16, paddingBottom: 40 },
  title: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 26 }, path: { fontFamily: FontFamily.semibold, fontSize: 18, lineHeight: 28 },
  text: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 22 }, map: { borderWidth: 1, borderRadius: Radius.lg, overflow: 'hidden' } });

import { useCallback } from 'react';
import { Controller } from 'react-hook-form';
import { FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import { ScanCodeButton } from '@/features/scanner/components/scan-code-button';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import type { useReceivingLocations } from '../../hooks/use-receiving-locations';
import type { ReceivingLocation } from '../../receiving.schema';
import { parseLocationScan } from '../../receiving-scan';

interface LocationPickerProps {
  readonly state: ReturnType<typeof useReceivingLocations>; readonly title: string; readonly excludedId?: string | null;
}
export function LocationPicker({ state, title, excludedId }: LocationPickerProps) {
  const theme = useTheme();
  const renderItem = useCallback(({ item }: { item: ReceivingLocation }) => <Button
    label={item.displayPath} variant="outline" disabled={state.query.isFetching || item.id === excludedId}
    onPress={() => state.choose(item)} />, [excludedId, state]);
  const total = state.query.data?.totalCount ?? 0;
  return <Modal visible={state.isOpen} animationType="slide" onRequestClose={state.close}>
    <SafeAreaProvider><SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <FlatList data={state.query.isError ? [] : state.query.data?.items ?? []} keyExtractor={item => item.id}
        renderItem={renderItem} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Controller control={state.form.control} name="searchTerm" render={({ field, fieldState }) => <TextField
            label="Tìm mã vị trí" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur}
            error={fieldState.error?.message} maxLength={101} autoCapitalize="characters" returnKeyType="search"
            labelAccessory={<ScanCodeButton compact label="Quét mã vị trí" title="Quét mã vị trí" onScan={code => {
              field.onChange(parseLocationScan(code).code.slice(0, 101)); void state.search();
            }} />}
            onSubmitEditing={() => { void state.search(); }} />} />
          <Button label="Tìm vị trí" onPress={() => { void state.search(); }} loading={state.query.isFetching} />
          {state.query.isPending && <Text style={{ color: theme.textSecondary }}>Đang tải vị trí…</Text>}
          {state.query.isError && <AlertBanner title="Chưa thể tải vị trí" variant="destructive" description={getApiErrorMessage(state.query.error)}>
            <Button label="Tải lại vị trí" variant="outline" onPress={() => { void state.query.refetch(); }} />
          </AlertBanner>}
        </View>}
        ListEmptyComponent={state.query.isSuccess ? <Text style={{ color: theme.textSecondary }}>Không tìm thấy vị trí phù hợp.</Text> : undefined}
        ListFooterComponent={<View style={styles.header}>
          {state.query.isSuccess && <Text style={{ color: theme.textSecondary }}>Trang {state.page}/{Math.max(1, Math.ceil(total / 20))}</Text>}
          <Button label="Trang trước" variant="outline" disabled={state.page <= 1 || state.query.isFetching} onPress={() => state.changePage(state.page - 1)} />
          <Button label="Trang sau" variant="outline" disabled={state.page * 20 >= total || state.query.isFetching} onPress={() => state.changePage(state.page + 1)} />
          <Button label="Đóng chọn vị trí" variant="ghost" onPress={state.close} />
        </View>} />
    </SafeAreaView></SafeAreaProvider>
  </Modal>;
}
const styles = StyleSheet.create({ root: { flex: 1 }, content: { padding: 20, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { gap: 12 }, title: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 32 } });

import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, Trash2, X } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { MAX_DAMAGE_PHOTOS, formatItemLocation, formatQuantity } from '../cycle-count.labels';
import {
  countFormSchema,
  parseQuantity,
  type CountFormValues,
  type CycleCountItem,
} from '../cycle-count.schema';
import type { DamagePhoto } from '../hooks/use-damage-photos';

interface DamagePhotoState {
  readonly photos: readonly DamagePhoto[];
  readonly isUploading: boolean;
  readonly error: string | null;
  readonly add: () => void;
  readonly remove: (id: string) => void;
}

interface CountEditorModalProps {
  readonly item: CycleCountItem | null;
  readonly isBlind: boolean;
  readonly isScanned: boolean;
  readonly isSaving: boolean;
  readonly errorMessage: string | null;
  readonly photoState: DamagePhotoState;
  readonly onSave: (values: CountFormValues) => void;
  readonly onClose: () => void;
}

export function CountEditorModal({ item, onClose, ...rest }: CountEditorModalProps) {
  return (
    <Modal visible={item !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {item ? <EditorBody key={item.id} item={item} onClose={onClose} {...rest} /> : null}
    </Modal>
  );
}

function EditorBody({
  item,
  isBlind,
  isScanned,
  isSaving,
  errorMessage,
  photoState,
  onSave,
  onClose,
}: Omit<CountEditorModalProps, 'item'> & { readonly item: CycleCountItem }) {
  const theme = useTheme();
  const [photoRequired, setPhotoRequired] = useState(false);
  const savedPhotos = item.damageEvidence ?? [];
  const form = useForm<CountFormValues>({
    resolver: zodResolver(countFormSchema),
    defaultValues: {
      countedQuantity: item.countedQuantity != null ? String(item.countedQuantity) : '',
      damagedQuantity: item.countedDamagedQuantity ? String(item.countedDamagedQuantity) : '',
      damageReason: item.damageReason ?? '',
      note: item.note ?? '',
    },
  });
  const damagedText = useWatch({ control: form.control, name: 'damagedQuantity' });
  const hasDamage = damagedText.trim() !== '' && parseQuantity(damagedText) > 0;
  const totalPhotos = savedPhotos.length + photoState.photos.length;

  function submit(values: CountFormValues) {
    const damaged = values.damagedQuantity === '' ? 0 : parseQuantity(values.damagedQuantity);
    // BE rejects damaged lines without 1..3 photos, so catch it before the round trip.
    if (damaged > 0 && totalPhotos === 0) {
      setPhotoRequired(true);
      return;
    }
    setPhotoRequired(false);
    onSave(values);
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
            Ghi nhận số lượng
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng" hitSlop={8} onPress={onClose} style={styles.close}>
            <X size={22} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.summary, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.name, { color: theme.text }]}>{item.productName}</Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              {item.productSku} · Vị trí {formatItemLocation(item)}
              {item.lotNumber ? ` · Lô ${item.lotNumber}` : ''}
            </Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>
              Sổ sách:{' '}
              {item.systemQuantity != null
                ? formatQuantity(item.systemQuantity)
                : isBlind
                  ? 'Đã ẩn (kiểm kê mù)'
                  : '—'}
              {item.unitName ? ` ${item.unitName}` : ''}
            </Text>
            {isScanned ? <Text style={[styles.meta, { color: theme.primary }]}>Đã nhận diện bằng mã quét</Text> : null}
          </View>

          {item.countHistory?.some((entry) => entry.recountReason) ? (
            <AlertBanner
              title="Quản lý yêu cầu đếm lại"
              description={item.countHistory.find((entry) => entry.recountReason)?.recountReason ?? undefined}
            />
          ) : null}

          <Controller
            control={form.control}
            name="countedQuantity"
            render={({ field, fieldState }) => (
              <TextField
                label="Số lượng đã đếm"
                keyboardType="decimal-pad"
                returnKeyType="next"
                autoFocus
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="damagedQuantity"
            render={({ field, fieldState }) => (
              <TextField
                label="Trong đó hỏng (nếu có)"
                keyboardType="decimal-pad"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          {hasDamage ? (
            <>
              <Controller
                control={form.control}
                name="damageReason"
                render={({ field, fieldState }) => (
                  <TextField
                    label="Lý do hàng hỏng"
                    multiline
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <View style={styles.photos}>
                <Text style={[styles.sectionLabel, { color: theme.text }]}>
                  Ảnh hàng hỏng ({totalPhotos}/{MAX_DAMAGE_PHOTOS})
                </Text>
                {savedPhotos.map((photo) => (
                  <Text key={photo.id} style={[styles.meta, { color: theme.textSecondary }]}>
                    Đã lưu: {photo.fileName}
                  </Text>
                ))}
                {photoState.photos.map((photo) => (
                  <View key={photo.id} style={styles.photoRow}>
                    <Text style={[styles.meta, styles.photoName, { color: theme.text }]} numberOfLines={1}>
                      {photo.fileName}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa ảnh ${photo.fileName}`}
                      hitSlop={8}
                      onPress={() => photoState.remove(photo.id)}
                      style={styles.close}>
                      <Trash2 size={18} color={theme.error} />
                    </Pressable>
                  </View>
                ))}
                <Button
                  label="Chụp ảnh"
                  variant="outline"
                  loading={photoState.isUploading}
                  disabled={totalPhotos >= MAX_DAMAGE_PHOTOS}
                  renderIcon={(color) => <Camera size={18} color={color} />}
                  onPress={photoState.add}
                />
                {photoState.error ? <AlertBanner variant="destructive" title={photoState.error} /> : null}
                {photoRequired ? (
                  <AlertBanner variant="destructive" title="Vui lòng chụp ít nhất một ảnh hàng hỏng." />
                ) : null}
              </View>
            </>
          ) : null}

          <Controller
            control={form.control}
            name="note"
            render={({ field, fieldState }) => (
              <TextField
                label="Ghi chú"
                multiline
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          {errorMessage ? <AlertBanner variant="destructive" title={errorMessage} /> : null}

          <Button
            label="Lưu số lượng"
            loading={isSaving}
            disabled={photoState.isUploading}
            onPress={() => void form.handleSubmit(submit)()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: { flex: 1, fontFamily: FontFamily.semibold, fontSize: 20 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { gap: 16, padding: 20, paddingBottom: 40 },
  summary: { gap: 4, padding: 14, borderWidth: 1, borderRadius: Radius.lg },
  name: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  photos: { gap: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoName: { flex: 1 },
  sectionLabel: { fontFamily: FontFamily.semibold, fontSize: 13 },
});

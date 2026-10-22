import { zodResolver } from '@hookform/resolvers/zod';
import * as Crypto from 'expo-crypto';
import { Camera, ShieldAlert, Trash2, X } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
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
import { toast } from 'sonner-native';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { FontFamily } from '@/constants/theme';
import type { InventoryStock } from '@/features/inventory/inventory.types';
import { useEvidencePhotos } from '@/hooks/use-evidence-photos';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { damageCasesApi, type ReportDamageBody } from '../damage-cases.api';
import {
  MAX_REPORT_PHOTOS,
  createReportDamageSchema,
  parseReportQuantity,
  type ReportDamageFormValues,
} from '../damage-cases.schema';
import { useDamageReportContext } from '../hooks/use-damage-report-context';
import { useReportDamageMutation } from '../hooks/use-damage-cases';

interface ReportDamageActionProps {
  readonly stock: InventoryStock;
  readonly disabled?: boolean;
}

/** Button plus form to report damaged stock for one inventory line. Hidden without the permission. */
export function ReportDamageAction(props: ReportDamageActionProps) {
  const context = useDamageReportContext(props.stock);
  if (!context.canReport) return null;
  return <ReportDamageForm key={context.key} {...props} />;
}

function ReportDamageForm({ stock, disabled = false }: ReportDamageActionProps) {
  const theme = useTheme();
  const { canReport, assertCurrentContext } = useDamageReportContext(stock);
  const commandLock = useRef(false);
  const formContext = useRef<(() => void) | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [photoRequired, setPhotoRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const attemptRef = useRef<{ key: string; body: ReportDamageBody } | null>(null);
  const mutation = useReportDamageMutation();
  const upload = useCallback(
    (asset: Parameters<typeof damageCasesApi.uploadEvidence>[1]) =>
      damageCasesApi.uploadEvidence(stock.warehouseId, asset, () => {
        if (!formContext.current) throw new Error("Phiên báo hỏng đã đóng.");
        formContext.current();
      }),
    [stock.warehouseId],
  );
  const photos = useEvidencePhotos({ upload, maxPhotos: MAX_REPORT_PHOTOS, fileNamePrefix: 'hang-hong' });
  const schema = useMemo(() => createReportDamageSchema(stock.availableQuantity), [stock.availableQuantity]);
  const form = useForm<ReportDamageFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { mode: 'Confirmed', quantity: '', reason: '' },
  });
  const mode = useWatch({ control: form.control, name: 'mode' });

  if (!canReport) return null;

  function close() {
    if (commandLock.current) return;
    formContext.current = null;
    photos.reset();
    setIsOpen(false);
  }
  function open() {
    if (disabled || commandLock.current) return;
    try { assertCurrentContext(); } catch (error) { toast.error(getApiErrorMessage(error)); return; }
    formContext.current = assertCurrentContext;
    form.reset({ mode: 'Confirmed', quantity: '', reason: '' });
    photos.reset();
    setPhotoRequired(false);
    setErrorMessage(null);
    attemptRef.current = null;
    setIsOpen(true);
  }

  async function submit(values: ReportDamageFormValues) {
    if (disabled || commandLock.current || photos.isUploading || !formContext.current) return;
    if (photos.photos.length === 0) {
      setPhotoRequired(true);
      return;
    }
    setPhotoRequired(false);
    const isConfirmed = values.mode === 'Confirmed';
    if (isConfirmed && !stock.version) {
      setErrorMessage('Thiếu phiên bản tồn kho. Vui lòng tải lại màn hình rồi thử lại.');
      return;
    }

    const fields = {
      productId: stock.productId,
      warehouseId: stock.warehouseId,
      slotId: stock.slotId,
      ...(stock.lotId ? { lotId: stock.lotId } : {}),
      ...(isConfirmed
        ? { quantity: parseReportQuantity(values.quantity), expectedStockVersion: stock.version ?? undefined }
        : {}),
      reason: values.reason,
      evidenceIds: photos.photos.map((photo) => photo.id),
    };
    // A refetch after an ambiguous timeout must not turn a retry into a new stock command.
    const key = JSON.stringify({ ...fields, expectedStockVersion: undefined });
    if (attemptRef.current?.key !== key) attemptRef.current = { key, body: { ...fields, commandId: Crypto.randomUUID() } };
    const body = attemptRef.current.body;

    try {
      const assertOriginalContext = formContext.current;
      assertOriginalContext();
      commandLock.current = true;
      await mutation.mutateAsync({ body, assertCurrentContext: assertOriginalContext });
      assertOriginalContext();
      toast.success(
        isConfirmed
          ? 'Đã ghi nhận hàng hỏng và chuyển số lượng xác nhận sang trạng thái giữ.'
          : 'Đã ghi nhận quan sát. Tồn kho chưa thay đổi cho đến khi xác nhận số lượng.',
      );
      formContext.current = null; photos.reset(); setIsOpen(false);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không báo được hàng hỏng. Vui lòng thử lại.'));
    } finally { commandLock.current = false; }
  }

  return (
    <>
      <Button
        label="Báo hàng hỏng"
        variant="outline"
        renderIcon={(color) => <ShieldAlert size={18} color={color} />}
        onPress={open}
        disabled={disabled || mutation.isPending}
      />
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
          <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
                Báo hàng hỏng
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                hitSlop={8}
                onPress={close}
                style={styles.close}>
                <X size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {disabled && <AlertBanner title="Đang cập nhật tồn kho. Đợi tải xong trước khi gửi báo hỏng." />}
              <View style={[styles.summary, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.name, { color: theme.text }]}>{stock.productName}</Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {stock.sku} · Khả dụng {stock.availableQuantity.toLocaleString('vi-VN')}
                  {stock.unitName ? ` ${stock.unitName}` : ''}
                </Text>
              </View>

              <View style={styles.modeRow}>
                <View style={styles.modeButton}>
                  <Button
                    label="Xác nhận số lượng"
                    variant={mode === 'Confirmed' ? 'primary' : 'outline'}
                    onPress={() => form.setValue('mode', 'Confirmed')}
                  />
                </View>
                <View style={styles.modeButton}>
                  <Button
                    label="Chỉ ghi nhận"
                    variant={mode === 'Observation' ? 'primary' : 'outline'}
                    onPress={() => form.setValue('mode', 'Observation')}
                  />
                </View>
              </View>
              {mode === 'Observation' ? (
                <AlertBanner
                  title="Ghi nhận quan sát"
                  description="Tồn kho chưa thay đổi. Bạn bổ sung số lượng xác nhận sau."
                />
              ) : (
                <Controller
                  control={form.control}
                  name="quantity"
                  render={({ field, fieldState }) => (
                    <TextField
                      label="Số lượng hỏng"
                      keyboardType="decimal-pad"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              )}

              <Controller
                control={form.control}
                name="reason"
                render={({ field, fieldState }) => (
                  <TextField
                    label="Lý do"
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
                  Ảnh bằng chứng ({photos.photos.length}/{MAX_REPORT_PHOTOS})
                </Text>
                {photos.photos.map((photo) => (
                  <View key={photo.id} style={styles.photoRow}>
                    <Text style={[styles.meta, styles.photoName, { color: theme.text }]} numberOfLines={1}>
                      {photo.fileName}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Xóa ảnh ${photo.fileName}`}
                      hitSlop={8}
                      onPress={() => photos.remove(photo.id)}
                      style={styles.close}>
                      <Trash2 size={18} color={theme.error} />
                    </Pressable>
                  </View>
                ))}
                <Button
                  label="Chụp ảnh"
                  variant="outline"
                  loading={photos.isUploading}
                  disabled={disabled || mutation.isPending || photos.photos.length >= MAX_REPORT_PHOTOS}
                  renderIcon={(color) => <Camera size={18} color={color} />}
                  onPress={() => void photos.add()}
                />
                {photos.error ? <AlertBanner variant="destructive" title={photos.error} /> : null}
                {photoRequired ? (
                  <AlertBanner variant="destructive" title="Cần ít nhất một ảnh bằng chứng." />
                ) : null}
              </View>

              {errorMessage ? <AlertBanner variant="destructive" title={errorMessage} /> : null}

              <Button
                label="Gửi báo cáo"
                loading={mutation.isPending}
                disabled={disabled || photos.isUploading}
                onPress={() => void form.handleSubmit(submit)()}
              />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
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
  summary: { gap: 4, padding: 14, borderWidth: 1, borderRadius: 12 },
  name: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeButton: { flex: 1 },
  photos: { gap: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoName: { flex: 1 },
  sectionLabel: { fontFamily: FontFamily.semibold, fontSize: 13 },
});

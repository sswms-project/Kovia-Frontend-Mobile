import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, FilePlus2, Trash2, X } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { FontFamily, Radius } from '@/constants/theme';
import { useMe } from '@/features/auth/hooks/use-me';
import { useInventoryReportContext } from '@/features/inventory/hooks/use-inventory-report-context';
import { useEvidencePhotos } from '@/hooks/use-evidence-photos';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { damageCasesApi, type AddDamageEvidenceBody } from '../damage-cases.api';
import {
  MAX_REPORT_PHOTOS,
  createAddEvidenceSchema,
  parseReportQuantity,
  type AddEvidenceFormValues,
} from '../damage-cases.schema';
import type { DamageCase } from '../damage-cases.types';
import { useAddDamageEvidenceMutation } from '../hooks/use-damage-cases';

interface AddDamageEvidenceActionProps {
  readonly damageCase: DamageCase;
}

/** Only the reporter may add evidence, and only while the case is open and still needs it. */
export function canAddDamageEvidence(damageCase: DamageCase, userId: string | undefined): boolean {
  return (
    !!userId &&
    userId.toLowerCase() === damageCase.reportedByUserId.toLowerCase() &&
    damageCase.status === 'Open' &&
    !!damageCase.version &&
    (!damageCase.isQuantityConfirmed || !!damageCase.evidenceRequestedAt)
  );
}

export function AddDamageEvidenceAction({ damageCase }: AddDamageEvidenceActionProps) {
  const me = useMe();
  const context = useInventoryReportContext({ id: damageCase.id, warehouseId: damageCase.warehouseId });
  if (!context.canReport || !canAddDamageEvidence(damageCase, me.data?.id)) return null;
  return <AddEvidenceForm key={context.key} damageCase={damageCase} />;
}

function AddEvidenceForm({ damageCase }: AddDamageEvidenceActionProps) {
  const theme = useTheme();
  const { assertCurrentContext } = useInventoryReportContext({ id: damageCase.id, warehouseId: damageCase.warehouseId });
  const needsQuantity = !damageCase.isQuantityConfirmed;
  const formContext = useRef<(() => void) | null>(null);
  const commandLock = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [photoRequired, setPhotoRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const mutation = useAddDamageEvidenceMutation();
  const upload = useCallback(
    (asset: Parameters<typeof damageCasesApi.uploadEvidence>[1]) =>
      damageCasesApi.uploadEvidence(damageCase.warehouseId, asset, () => {
        if (!formContext.current) throw new Error('Phiên bổ sung bằng chứng đã đóng.');
        formContext.current();
      }),
    [damageCase.warehouseId],
  );
  const photos = useEvidencePhotos({ upload, maxPhotos: MAX_REPORT_PHOTOS, fileNamePrefix: 'hang-hong' });
  const schema = useMemo(
    () => createAddEvidenceSchema(needsQuantity, damageCase.availableQuantity),
    [needsQuantity, damageCase.availableQuantity],
  );
  const form = useForm<AddEvidenceFormValues>({ resolver: zodResolver(schema), defaultValues: { confirmedQuantity: '' } });

  function close() {
    if (commandLock.current) return;
    formContext.current = null;
    photos.reset();
    setIsOpen(false);
  }

  function open() {
    try {
      assertCurrentContext();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      return;
    }
    formContext.current = assertCurrentContext;
    form.reset({ confirmedQuantity: '' });
    photos.reset();
    setPhotoRequired(false);
    setErrorMessage(null);
    setIsOpen(true);
  }

  async function submit(values: AddEvidenceFormValues) {
    const assertOriginalContext = formContext.current;
    if (commandLock.current || photos.isUploading || !assertOriginalContext || !damageCase.version) return;
    if (photos.photos.length === 0) {
      setPhotoRequired(true);
      return;
    }
    if (needsQuantity && !damageCase.availableStockVersion) {
      setErrorMessage('Thiếu phiên bản tồn kho. Vui lòng tải lại danh sách rồi thử lại.');
      return;
    }
    setPhotoRequired(false);

    const body: AddDamageEvidenceBody = {
      evidenceIds: photos.photos.map((photo) => photo.id),
      expectedCaseVersion: damageCase.version,
      ...(needsQuantity
        ? {
            confirmedQuantity: parseReportQuantity(values.confirmedQuantity),
            expectedStockVersion: damageCase.availableStockVersion ?? undefined,
          }
        : {}),
    };

    try {
      assertOriginalContext();
      commandLock.current = true;
      await mutation.mutateAsync({ id: damageCase.id, body, assertCurrentContext: assertOriginalContext });
      toast.success('Đã bổ sung bằng chứng và gửi lại hồ sơ để xem xét.');
      formContext.current = null;
      photos.reset();
      setIsOpen(false);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Không bổ sung được bằng chứng. Vui lòng thử lại.'));
    } finally {
      commandLock.current = false;
    }
  }

  const isBusy = mutation.isPending || photos.isUploading;

  return (
    <>
      <Button
        label="Bổ sung bằng chứng"
        variant="outline"
        renderIcon={(color) => <FilePlus2 size={18} color={color} />}
        onPress={open}
        disabled={mutation.isPending}
      />
      <Modal visible={isOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
          <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
                Bổ sung bằng chứng
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng" hitSlop={8} onPress={close} style={styles.close}>
                <X size={22} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              <View style={[styles.summary, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.name, { color: theme.text }]}>{damageCase.productName}</Text>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {damageCase.sku} · Khả dụng {damageCase.availableQuantity.toLocaleString('vi-VN')}
                  {damageCase.unitName ? ` ${damageCase.unitName}` : ''}
                </Text>
              </View>

              {needsQuantity ? (
                <>
                  <AlertBanner
                    title="Xác nhận số lượng hỏng"
                    description="Hồ sơ này mới ghi nhận quan sát. Nhập số lượng hỏng thực tế để chuyển sang trạng thái giữ."
                  />
                  <Controller
                    control={form.control}
                    name="confirmedQuantity"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="Số lượng hỏng xác nhận"
                        keyboardType="decimal-pad"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </>
              ) : (
                <AlertBanner title="Quản lý yêu cầu bổ sung bằng chứng" description="Chụp thêm ảnh rồi gửi lại để được xem xét." />
              )}

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
                  disabled={mutation.isPending || photos.photos.length >= MAX_REPORT_PHOTOS}
                  renderIcon={(color) => <Camera size={18} color={color} />}
                  onPress={() => void photos.add()}
                />
                <Button
                  label="Chọn ảnh có sẵn"
                  variant="outline"
                  disabled={isBusy || photos.photos.length >= MAX_REPORT_PHOTOS}
                  onPress={() => void photos.choose()}
                />
                {photos.error ? <AlertBanner variant="destructive" title={photos.error} /> : null}
                {photoRequired ? <AlertBanner variant="destructive" title="Cần ít nhất một ảnh bằng chứng." /> : null}
              </View>

              {errorMessage ? <AlertBanner variant="destructive" title={errorMessage} /> : null}

              <Button
                label="Gửi bổ sung"
                loading={mutation.isPending}
                disabled={photos.isUploading}
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
  summary: { gap: 4, padding: 14, borderWidth: 1, borderRadius: Radius.lg },
  name: { fontFamily: FontFamily.semibold, fontSize: 16, lineHeight: 22 },
  meta: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  photos: { gap: 8 },
  photoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoName: { flex: 1 },
  sectionLabel: { fontFamily: FontFamily.semibold, fontSize: 13 },
});

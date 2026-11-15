import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import type { SelectionOption } from '@/components/ui/selection-field';
import { FontFamily, MaxContentWidth } from '@/constants/theme';
import { useReceiptContext } from '@/features/receiving/hooks/use-receipt-context';
import { useExitProtection, useScreenSubtitle } from '@/hooks/use-screen-exit';
import { useTheme } from '@/hooks/use-theme';
import { getApiErrorMessage } from '@/lib/api-error';

import { FailedPanel, ReviewHeader, UploadPanel } from '../components/document-import-panels';
import { ReviewLineCard } from '../components/review-line-card';
import { useInboundDocumentImport } from '../hooks/use-inbound-document-import';
import { reviewFormSchema, type DocumentImport, type ReviewForm } from '../inbound-document-import.schema';

const EMPTY_FORM: ReviewForm = { acknowledgeWarehouseMismatch: false, lines: [] };

function toForm(item: DocumentImport | undefined): ReviewForm {
  const review = item?.review;
  if (!review) return EMPTY_FORM;
  const text = (value: number | null) => (value === null ? '' : String(value));
  return {
    acknowledgeWarehouseMismatch: review.warehouseMismatchAcknowledged,
    lines: review.lines.map(line => ({
      sourceLineNumber: line.sourceLineNumber, inboundRequestItemId: line.inboundRequestItemId ?? '', isLotTracked: line.isLotTracked,
      confirmedQuantity: text(line.confirmedQuantity ?? line.documentQuantity), damagedQuantity: text(line.damagedQuantity),
      exceptionReason: line.exceptionReason ?? '', lotNumber: line.lotNumber ?? '',
      manufacturedDate: line.manufacturedDate ?? '', expiryDate: line.expiryDate ?? '',
    })),
  };
}

interface Props { readonly documentId: string }

export function InboundDocumentImportScreen({ documentId }: Props) {
  const theme = useTheme();
  const context = useReceiptContext('receiving', documentId);
  const ocr = useInboundDocumentImport(context);
  const task = context.task.data;
  const item = ocr.documentImport.data;
  const review = item?.review ?? null;
  const busy = ocr.picking || ocr.upload.isPending || ocr.review.isPending || ocr.draft.isPending;

  const form = useForm<ReviewForm>({ resolver: zodResolver(reviewFormSchema), defaultValues: EMPTY_FORM });
  const { fields } = useFieldArray({ control: form.control, name: 'lines' });
  const { errors, isDirty } = form.formState;
  const acknowledged = useWatch({ control: form.control, name: 'acknowledgeWarehouseMismatch' });
  const watchedLines = useWatch({ control: form.control, name: 'lines' });

  useEffect(() => { form.reset(toForm(item)); }, [item, form]);

  const goodsReceiptId = item?.goodsReceiptId ?? (ocr.draft.isSuccess ? ocr.draft.data : null);
  useEffect(() => {
    if (goodsReceiptId) router.replace({ pathname: '/(account)/receiving/[id]', params: { id: documentId } });
  }, [goodsReceiptId, documentId]);

  useScreenSubtitle(context.canView ? task?.inboundRequestCode : undefined);
  useExitProtection(() => ({ busy }));

  const options = useMemo<readonly SelectionOption[]>(() => (task?.lines ?? []).map(line => ({
    value: line.inboundRequestItemId, label: `${line.productSKU} · ${line.productName}`,
    description: `Còn ${line.remainingQuantity} ${line.enteredUnitName}`,
  })), [task?.lines]);
  const lotTracked = useMemo(() => new Map((task?.lines ?? []).map(line => [line.inboundRequestItemId, line.isLotTracked])), [task?.lines]);

  const selectItem = useCallback((index: number, itemId: string) => {
    form.setValue(`lines.${index}.inboundRequestItemId`, itemId, { shouldDirty: true, shouldValidate: true });
    form.setValue(`lines.${index}.isLotTracked`, lotTracked.get(itemId) ?? false, { shouldDirty: true });
  }, [form, lotTracked]);

  const content = [styles.content, { backgroundColor: theme.background }];
  const header = <View style={styles.header}>
    <Text style={[styles.kicker, { color: theme.primary }]}>KOVIA · {context.access.warehouse?.warehouseName ?? 'Kho'}</Text>
    <Text style={[styles.title, { color: theme.text }]}>Quét phiếu giao hàng bằng AI</Text>
  </View>;

  if (!context.canView) return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.root, { backgroundColor: theme.background }]}>
    <View style={content}>
      {header}
      <AlertBanner variant="destructive" title="Không thể mở chứng từ" description={context.access.selection.notice ?? 'Bạn chưa có quyền hoặc chưa chọn kho làm việc.'}>
        <Button label="Chọn kho làm việc" onPress={() => router.navigate('/')} />
        <Button label="Kiểm tra lại quyền" variant="outline" loading={context.access.profile.isFetching} onPress={() => void context.access.refresh()} />
      </AlertBanner>
    </View>
  </SafeAreaView>;

  function body() {
    if (context.task.isLoading) return <Loading label="Đang tải yêu cầu nhập kho…" />;
    if (context.task.isError || !task) return <AlertBanner variant="destructive" title="Không tải được yêu cầu nhập kho"
      description={getApiErrorMessage(context.task.error, 'Vui lòng thử lại.')}>
      <Button label="Thử lại" onPress={() => void context.task.refetch()} />
    </AlertBanner>;
    if (ocr.upload.isPending) return <Loading label="Đang phân tích chứng từ… có thể mất đến 1 phút." />;
    if (!ocr.importId) return <UploadPanel busy={ocr.picking} onPick={source => void ocr.choose(source)} />;
    if (ocr.documentImport.isLoading) return <Loading label="Đang tải kết quả AI…" />;
    if (ocr.documentImport.isError || !item) return <AlertBanner variant="destructive" title="Không tải được kết quả AI"
      description={getApiErrorMessage(ocr.documentImport.error, 'Vui lòng thử lại.')}>
      <Button label="Thử lại" onPress={() => void ocr.documentImport.refetch()} />
      <Button label="Chọn tệp khác" variant="outline" onPress={ocr.reset} />
    </AlertBanner>;
    if (item.status === 'Failed' || !review) return <FailedPanel item={item} onRetry={ocr.reset} onManual={() => router.back()} />;
    return <ReviewHeader item={item} review={review} acknowledged={acknowledged}
      onAcknowledge={value => form.setValue('acknowledgeWarehouseMismatch', value, { shouldDirty: true })} />;
  }

  const reviewing = !!review && item?.status !== 'Failed';
  const canDraft = reviewing && !isDirty && item?.status === 'ReadyForDraft' && !!review?.canCreateDraft;
  const footer = reviewing ? <View style={styles.footer}>
    {errors.lines?.root?.message && <AlertBanner variant="destructive" title={errors.lines.root.message} />}
    <Button label="Lưu và kiểm tra lại" variant={canDraft ? 'outline' : 'primary'} loading={ocr.review.isPending}
      disabled={busy} onPress={() => void form.handleSubmit(values => ocr.review.mutate(values))()} />
    <Button label="Tạo phiếu nhận hàng nháp" loading={ocr.draft.isPending} disabled={busy || !canDraft} onPress={() => ocr.draft.mutate()} />
    {!canDraft && <Text style={[styles.hint, { color: theme.textSecondary }]}>
      {isDirty ? 'Lưu thay đổi trước khi tạo phiếu nháp.' : 'Xử lý hết lỗi rồi lưu lại để tạo phiếu nháp.'}
    </Text>}
    <Button label="Chọn tệp khác" variant="ghost" disabled={busy} onPress={ocr.reset} />
  </View> : undefined;

  return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.root, { backgroundColor: theme.background }]}>
    <FlatList
      data={reviewing ? fields : []}
      keyExtractor={field => field.id}
      contentContainerStyle={content}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={<View style={styles.header}>{header}{body()}</View>}
      ListFooterComponent={footer}
      extraData={watchedLines}
      renderItem={({ index }) => {
        const line = review?.lines[index];
        if (!line) return null;
        const itemId = watchedLines?.[index]?.inboundRequestItemId ?? '';
        return <ReviewLineCard index={index} line={line} control={form.control} errors={errors.lines} options={options}
          isLotTracked={lotTracked.get(itemId) ?? line.isLotTracked} disabled={busy} onSelectItem={selectItem} />;
      }}
    />
  </SafeAreaView>;
}

function Loading({ label }: { readonly label: string }) {
  const theme = useTheme();
  return <View style={styles.loading}>
    <ActivityIndicator color={theme.primary} />
    <Text style={[styles.hint, { color: theme.textSecondary }]}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, gap: 16 },
  header: { gap: 16 },
  kicker: { fontFamily: FontFamily.semibold, fontSize: 13, lineHeight: 18 },
  title: { fontFamily: FontFamily.bold, fontSize: 26, lineHeight: 35 },
  footer: { gap: 12 },
  hint: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  loading: { alignItems: 'center', gap: 12, paddingVertical: 32 },
});

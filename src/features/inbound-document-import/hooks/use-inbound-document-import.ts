import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { toast } from 'sonner-native';

import { P } from '@/config/permission-codes';
import type { ReceiptContext } from '@/features/receiving/hooks/use-receipt-context';
import { getApiErrorMessage } from '@/lib/api-error';
import { logger } from '@/lib/logger';

import { inboundDocumentImportApi } from '../inbound-document-import.api';
import type { PickedDocument, ReviewForm } from '../inbound-document-import.schema';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

async function pickDocument(source: 'camera' | 'library'): Promise<PickedDocument | null> {
  if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
    throw new Error('Cần cấp quyền camera để chụp phiếu giao hàng.');
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 0.8, exif: false, base64: false };
  const selected = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (selected.canceled) return null;
  const image = selected.assets[0];
  if (!image?.mimeType || !ALLOWED_TYPES.includes(image.mimeType)) throw new Error('Vui lòng dùng ảnh JPG hoặc PNG cho phiếu giao hàng.');
  if (image.fileSize !== undefined && (image.fileSize <= 0 || image.fileSize > MAX_FILE_BYTES))
    throw new Error('Ảnh phải có dữ liệu và không vượt quá 10 MB.');
  const extension = image.mimeType === 'image/png' ? 'png' : 'jpg';
  // The backend requires the file extension to match the mime type, so never trust the picker's name blindly.
  const baseName = (image.fileName ?? 'phieu-giao').replace(/\.[^.]+$/, '');
  return { uri: image.uri, mimeType: image.mimeType, fileName: `${baseName}.${extension}`, file: image.file };
}

/** Upload a delivery note for OCR, then review it and turn it into a draft goods receipt. */
export function useInboundDocumentImport(context: ReceiptContext) {
  const inboundRequestId = context.documentId;
  const [startedId, setStartedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const importId = startedId ?? context.task.data?.activeDocumentImportId ?? null;
  const queryKey = [...context.prefix, 'document-import', importId];

  const documentImport = useQuery({
    queryKey, enabled: !!context.scope && !!importId, retry: false,
    queryFn: ({ signal }) => inboundDocumentImportApi.get(importId!, signal),
  });

  const upload = useMutation({
    mutationFn: (document: PickedDocument) => {
      context.assertCurrent(P.GOODS_RECEIPTS_CREATE);
      return inboundDocumentImportApi.start({ document, inboundRequestId, warehouseId: context.scope!.warehouseId });
    },
    onSuccess: id => setStartedId(id),
    onError: error => {
      logger.warn('Document import upload failed', { statusCode: (error as { statusCode?: number }).statusCode });
      toast.error(getApiErrorMessage(error, 'Không tải được chứng từ lên.'));
    },
  });

  const review = useMutation({
    mutationFn: (form: ReviewForm) => {
      context.assertCurrent(P.GOODS_RECEIPTS_CREATE);
      return inboundDocumentImportApi.review(importId!, inboundRequestId, form);
    },
    onSuccess: () => documentImport.refetch(),
    onError: error => toast.error(getApiErrorMessage(error, 'Không lưu được kết quả rà soát.')),
  });

  const draft = useMutation({
    mutationFn: () => {
      context.assertCurrent(P.GOODS_RECEIPTS_CREATE);
      return inboundDocumentImportApi.createDraftReceipt(importId!);
    },
    onSuccess: async goodsReceiptId => {
      context.rememberReceipt(goodsReceiptId);
      await context.refresh();
      toast.success('Đã tạo phiếu nhận hàng nháp');
    },
    onError: error => toast.error(getApiErrorMessage(error, 'Không tạo được phiếu nhận hàng nháp.')),
  });

  async function choose(source: 'camera' | 'library') {
    setPicking(true);
    try {
      const document = await pickDocument(source);
      if (document) upload.mutate(document);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Không mở được ảnh.'));
    } finally {
      setPicking(false);
    }
  }

  function reset() {
    setStartedId(null);
    upload.reset();
  }

  return { importId, documentImport, upload, review, draft, choose, picking, reset,
    // A resumed import from the task is only replaced once the user picks a new file.
    discardActive: () => setStartedId(null) };
}
export type InboundDocumentImportState = ReturnType<typeof useInboundDocumentImport>;

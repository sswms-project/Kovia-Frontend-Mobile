import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';

import { P } from '@/config/permission-codes';
import { getApiErrorMessage } from '@/lib/api-error';

import { receivingApi } from '../receiving.api';
import type { ReceiptContext } from './use-receipt-context';

/** Photos of the paper delivery slip, attached to the receipt on submit. */
export function useDocumentEvidence(context: ReceiptContext) {
  const key = context.evidenceKey;
  const [record, setRecord] = useState<{ key: string; files: { id: string; fileName: string }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const files = record?.key === key ? record.files : [];
  async function addPhoto(source: 'camera' | 'library') {
    const receipt = context.receipt.data;
    const warehouseId = receipt?.warehouseId ?? context.scope?.warehouseId;
    if (!warehouseId || lock.current || files.length >= 5) return;
    const assertCurrent = () => {
      context.assertCurrent(P.GOODS_RECEIPTS_SUBMIT);
      if (receipt) context.assertAction('Submit', receipt.version, P.GOODS_RECEIPTS_SUBMIT);
      else if (!context.task.data || context.task.isError || context.task.isFetching || context.task.data.assignedTo !== context.userId)
        throw new Error('Công việc nhận hàng đã thay đổi. Vui lòng tải lại.');
    };
    lock.current = true; setBusy(true); setError(null);
    try {
      assertCurrent();
      if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted)
        throw new Error('Cần cấp quyền camera để chụp phiếu giao hàng.');
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 0.8, exif: false, base64: false };
      const selected = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      assertCurrent();
      if (selected.canceled) return;
      const image = selected.assets[0];
      if (!image || !image.mimeType || !['image/jpeg', 'image/png'].includes(image.mimeType))
        throw new Error('Vui lòng dùng ảnh JPG hoặc PNG cho phiếu giao hàng.');
      if (image.fileSize !== undefined && (image.fileSize <= 0 || image.fileSize > 10 * 1024 * 1024))
        throw new Error('Ảnh phải có dữ liệu và không vượt quá 10 MB.');
      const result = await receivingApi.uploadEvidence(warehouseId,
        { uri: image.uri, mimeType: image.mimeType, fileName: image.fileName ?? `phieu-giao.${image.mimeType === 'image/png' ? 'png' : 'jpg'}`, file: image.file }, assertCurrent);
      setRecord(previous => ({ key, files: [...(previous?.key === key ? previous.files : []), { id: result.id, fileName: result.fileName }] }));
    } catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { lock.current = false; setBusy(false); }
  }
  return { files, busy, error, addPhoto,
    remove: (id: string) => { if (!lock.current) setRecord({ key, files: files.filter(file => file.id !== id) }); },
  };
}

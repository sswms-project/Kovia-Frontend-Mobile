import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';

import { P } from '@/config/permission-codes';
import { getApiErrorMessage } from '@/lib/api-error';

import { receivingApi } from '../receiving.api';
import type { ReceiptContext } from './use-receipt-context';

export function useRefusalEvidence(context: ReceiptContext) {
  const key = `${context.contextKey}:${context.receipt.data?.id}:${context.receipt.data?.version}`;
  const [record, setRecord] = useState<{ key: string; files: { id: string; fileName: string }[]; acknowledged: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const files = record?.key === key ? record.files : [];
  const acknowledged = record?.key === key && record.acknowledged;
  async function addPhoto() {
    const receipt = context.receipt.data;
    if (!receipt || lock.current || files.length >= 5) return;
    const assertCurrent = () => context.assertAction('Submit', receipt.version, P.GOODS_RECEIPTS_SUBMIT);
    lock.current = true; setBusy(true); setError(null);
    try {
      assertCurrent();
      const selected = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.8, exif: false, base64: false });
      assertCurrent();
      if (selected.canceled) return;
      const image = selected.assets[0];
      if (!image || !image.mimeType || !['image/jpeg', 'image/png'].includes(image.mimeType))
        throw new Error('Vui lòng chọn ảnh JPG hoặc PNG làm bằng chứng.');
      if (image.fileSize !== undefined && (image.fileSize <= 0 || image.fileSize > 10 * 1024 * 1024))
        throw new Error('Ảnh phải có dữ liệu và không vượt quá 10 MB.');
      const result = await receivingApi.uploadEvidence(receipt.warehouseId,
        { uri: image.uri, mimeType: image.mimeType, fileName: image.fileName ?? `kiem-hang.${image.mimeType === 'image/png' ? 'png' : 'jpg'}`, file: image.file }, assertCurrent);
      setRecord(previous => ({ key, acknowledged: previous?.key === key && previous.acknowledged,
        files: [...(previous?.key === key ? previous.files : []), { id: result.id, fileName: result.fileName }] }));
    } catch (failure) { setError(getApiErrorMessage(failure)); }
    finally { lock.current = false; setBusy(false); }
  }
  return { files, acknowledged, busy, error, addPhoto,
    toggle: () => { if (!lock.current) setRecord({ key, files, acknowledged: !acknowledged }); },
    remove: (id: string) => { if (!lock.current) setRecord({ key, files: files.filter(file => file.id !== id), acknowledged }); },
  };
}

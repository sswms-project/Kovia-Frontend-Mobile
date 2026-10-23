import { useQueryClient } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { api } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

export interface EvidenceFile { readonly id: string; readonly fileName: string }
export function useEvidencePreview(kind: 'inventory' | 'cycle-count' = 'inventory') {
  const access = useWarehouseAccess(); const client = useQueryClient();
  const { identity, warehouseId, signature, revision } = access.selection;
  const key = JSON.stringify([identity, warehouseId, signature, revision]);
  const active = useRef<{ key: string; controller: AbortController } | null>(null);
  const [preview, setPreview] = useState<{ key: string; file: EvidenceFile; uri?: string; error?: string } | null>(null);
  function close() { active.current?.controller.abort(); active.current = null; setPreview(null); }
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') close(); });
    return () => { active.current?.controller.abort(); active.current = null; subscription.remove(); };
  }, [key]);
  async function open(file: EvidenceFile) {
    close();
    const controller = new AbortController(); const attempt = { key, controller }; active.current = attempt;
    const assertCurrentContext = () => {
      const selection = useWarehouseSelection.getState(); const profile = client.getQueryData<UserProfile>(profileQueryKey);
      const snapshot = profile ? warehouseSnapshot(profile) : null;
      const permission = kind === 'inventory' ? P.INVENTORY_VIEW : P.CYCLE_COUNTS_VIEW;
      if (active.current !== attempt || controller.signal.aborted || !useAuth.getState().signedIn || !access.ready ||
        selection.identity !== identity || selection.warehouseId !== warehouseId || selection.signature !== signature || selection.revision !== revision ||
        !snapshot?.activeUser || snapshot.signature !== signature || !profile?.permissions.includes(permission))
        throw new Error('Kho, tài khoản hoặc quyền xem ảnh đã thay đổi.');
    };
    setPreview({ key, file });
    try {
      assertCurrentContext(); nonEmptyDotNetGuidSchema('Mã bằng chứng không hợp lệ.').parse(file.id);
      const config: AxiosRequestConfig & { assertCurrentContext: () => void } = {
        responseType: 'arraybuffer', signal: controller.signal, assertCurrentContext, maxContentLength: 10 * 1024 * 1024,
      };
      const response = await api.get<ArrayBuffer>(`/${kind === 'inventory' ? 'inventory' : 'cycle-counts'}/evidence/${file.id}`, config);
      assertCurrentContext();
      const bytes = new Uint8Array(response.data);
      if (!bytes.byteLength || bytes.byteLength > 10 * 1024 * 1024) throw new Error('Ảnh trống hoặc vượt giới hạn xem 10 MB.');
      const contentType = String(response.headers['content-type'] ?? '').split(';')[0].toLowerCase();
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      if (!(contentType === 'image/jpeg' && jpeg) && !(contentType === 'image/png' && png)) throw new Error('Chỉ xem được ảnh JPG hoặc PNG hợp lệ.');
      const chunks: string[] = [];
      for (let start = 0; start < bytes.length; start += 24576) {
        assertCurrentContext(); chunks.push(btoa(String.fromCharCode(...bytes.subarray(start, start + 24576))));
        if (chunks.length % 16 === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }
      assertCurrentContext(); setPreview({ key, file, uri: `data:${contentType};base64,${chunks.join('')}` });
    } catch (failure) { if (active.current === attempt && !controller.signal.aborted) setPreview({ key, file, error: getApiErrorMessage(failure) }); }
  }
  return { preview: access.ready && preview?.key === key ? preview : null, open, close,
    imageError: () => setPreview(value => value ? { key: value.key, file: value.file, error: 'Không đọc được nội dung ảnh. Vui lòng thử tải lại.' } : null) };
}

import { useEffect, useLayoutEffect, useRef } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { Alert, AppState } from 'react-native';
import { toast } from 'sonner-native';

import { useAuth } from '@/features/auth/auth.store';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { API_BASE_URL } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/api-error';
import { formDraftStorage } from '@/lib/form-draft-storage';

interface Options<T extends FieldValues> {
  form: UseFormReturn<T>; feature: string; documentId: string; lineId?: string; version?: string; enabled: boolean;
  assertCurrent: () => void;
}
function editable(values: FieldValues): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key,
    /scanned|scan$|confirmedSlotCode/i.test(key) ? '' : key === 'countMethod' ? 'Manual' : /evidenceIds$/i.test(key) ? [] : value]));
}

export function useFormDraft<T extends FieldValues>(options: Options<T>) {
  const selection = useWarehouseSelection();
  const scope = JSON.stringify([API_BASE_URL, selection.identity, selection.warehouseId, options.feature, options.documentId, options.lineId ?? '']);
  const latest = useRef(options);
  const currentScope = useRef(scope);
  useLayoutEffect(() => { latest.current = options; currentScope.current = scope; });
  const ready = useRef(false); const pending = useRef(false); const stopped = useRef(false);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = () => {
    if (currentScope.current !== scope || !latest.current.enabled || !useAuth.getState().signedIn ||
      useWarehouseSelection.getState().identity !== selection.identity || useWarehouseSelection.getState().warehouseId !== selection.warehouseId)
      throw new Error('Tài khoản, kho hoặc form đã thay đổi.');
    latest.current.assertCurrent();
  };
  function cancelTimer() { if (timer.current) clearTimeout(timer.current); timer.current = null; }
  async function save(isPending: boolean) {
    current();
    await formDraftStorage.write({ scope, version: latest.current.version ?? '', pending: isPending,
      values: isPending ? {} : editable(latest.current.form.getValues()) }, current);
  }
  useEffect(() => {
    if (!options.enabled || !options.version) return;
    let active = true; ready.current = false; pending.current = false; stopped.current = false; dirty.current = false;
    void formDraftStorage.read(scope).then(draft => {
      if (!active) return;
      current();
      if (!draft) { ready.current = true; return; }
      const discard = () => { if (!active) return; void formDraftStorage.remove(scope).catch(failure => toast.error(getApiErrorMessage(failure))); ready.current = true; };
      if (draft.pending || draft.version !== latest.current.version) {
        Alert.alert('Cần kiểm tra chứng từ', draft.pending
          ? 'App đã đóng trong lúc gửi. Hãy tải lại và kiểm tra lịch sử trước khi nhập lại để tránh ghi nhận hai lần. Bản nháp này không được gửi lại tự động.'
          : 'Chứng từ đã đổi phiên bản. Bản nháp cũ không được khôi phục vào phiên bản mới.', [{ text: 'Đã hiểu', onPress: discard }]);
        return;
      }
      Alert.alert('Khôi phục dữ liệu nhập dở?', 'Chỉ khôi phục nội dung form. Bạn cần quét lại mã, bổ sung lại ảnh và kiểm tra trước khi lưu.', [
        { text: 'Bỏ bản nháp', style: 'destructive', onPress: discard },
        { text: 'Khôi phục', onPress: () => {
          if (!active) return;
          try {
            current();
            if (draft.version !== latest.current.version) throw new Error('Phiên bản đã thay đổi. Vui lòng mở lại form.');
            // Private, scoped storage contains this form's own values; submission still uses its Zod resolver.
            latest.current.form.reset(editable(draft.values) as T, { keepDefaultValues: true });
            ready.current = true; dirty.current = true; toast.success('Đã khôi phục dữ liệu nhập dở. Vui lòng kiểm tra trước khi lưu hoặc gửi.');
          } catch (failure) { toast.error(getApiErrorMessage(failure)); }
        } },
      ]);
    }).catch(failure => { if (active) { ready.current = true; toast.error(`Không đọc được bản nháp: ${getApiErrorMessage(failure)}`); } });
    const flush = () => {
      cancelTimer();
      if (active && ready.current && !pending.current && !stopped.current && dirty.current)
        void save(false).catch(failure => { if (active) toast.error(`Chưa lưu được bản nháp: ${getApiErrorMessage(failure)}`); });
    };
    const subscription = options.form.watch(() => {
      if (!ready.current || pending.current || stopped.current) return;
      dirty.current = true;
      cancelTimer(); timer.current = setTimeout(flush, 500);
    });
    const appState = AppState.addEventListener('change', state => { if (state !== 'active') flush(); });
    return () => { flush(); active = false; cancelTimer(); subscription.unsubscribe(); appState.remove(); };
    // A changed version is checked on restore/save, without reopening an alert during background refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, options.enabled]);
  return {
    beforeSubmit: async () => {
      if (!latest.current.version) return;
      if (!ready.current) throw new Error('Đang kiểm tra bản nháp. Vui lòng hoàn tất bước khôi phục trước khi gửi.');
      pending.current = true; cancelTimer(); await save(true);
    },
    clear: async () => { stopped.current = true; cancelTimer(); await formDraftStorage.remove(scope).catch(failure => toast.error(`Chưa xóa được bản nháp: ${getApiErrorMessage(failure)}`)); },
  };
}

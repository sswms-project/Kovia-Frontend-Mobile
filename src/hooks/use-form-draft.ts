import { useEffect, useLayoutEffect, useRef } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { Alert, AppState } from 'react-native';
import { toast } from 'sonner-native';
import * as Crypto from 'expo-crypto';

import { useAuth } from '@/features/auth/auth.store';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { API_BASE_URL } from '@/lib/api';
import { getApiErrorMessage, isApiErrorResponse } from '@/lib/api-error';
import { formDraftStorage, type PendingOperation } from '@/lib/form-draft-storage';
import { useExitProtection } from './use-screen-exit';

interface PendingCommand { operation: string; commandId: string; content: string; expectedVersion: string; documentId: string; receiptId?: string }

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
  const operation = useRef<PendingOperation | undefined>(undefined);
  const inFlight = useRef(false);
  const dirty = useRef(false);
  const hasVersion = !!options.version;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assertScope = () => {
    if (currentScope.current !== scope || !latest.current.enabled || !useAuth.getState().signedIn ||
      useWarehouseSelection.getState().identity !== selection.identity || useWarehouseSelection.getState().warehouseId !== selection.warehouseId)
      throw new Error('Tài khoản, kho hoặc form đã thay đổi.');
  };
  const current = () => { assertScope(); latest.current.assertCurrent(); };
  function cancelTimer() { if (timer.current) clearTimeout(timer.current); timer.current = null; }
  async function save(isPending: boolean, resolvedPrevious = false) {
    current();
    await formDraftStorage.write({ scope, version: latest.current.version ?? '', pending: isPending,
      ...(isPending && operation.current ? { operation: operation.current } : {}),
      values: isPending ? {} : editable(latest.current.form.getValues()) }, current, resolvedPrevious);
  }
  useEffect(() => {
    if (!options.enabled) return;
    let active = true; ready.current = false; pending.current = false; stopped.current = false; dirty.current = false; operation.current = undefined; inFlight.current = false;
    void Promise.all([formDraftStorage.read(scope), formDraftStorage.pending(scope)]).then(([draft, unresolved]) => {
      if (!active) return;
      assertScope();
      if (unresolved.length) {
        pending.current = true;
        Alert.alert('Cần kiểm tra chứng từ', 'Có thao tác chưa xác định kết quả. Hãy tải lại chứng từ và lịch sử hoặc nhờ quản lý đối soát. Đóng cảnh báo không xóa thông tin lệnh và không cho gửi lệnh thay thế.', [{ text: 'Đã hiểu' }]);
        return;
      }
      if (!latest.current.version) { ready.current = true; return; }
      if (!draft) { ready.current = true; return; }
      const discard = () => { if (!active) return; void formDraftStorage.remove(scope).catch(failure => toast.error(getApiErrorMessage(failure))); ready.current = true; };
      if (draft.version !== latest.current.version) {
        Alert.alert('Cần kiểm tra chứng từ', 'Chứng từ đã đổi phiên bản. Bản nháp cũ không được khôi phục vào phiên bản mới.', [{ text: 'Đã hiểu', onPress: discard }]);
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
    }).catch(failure => { if (active) toast.error(`Không đọc được bản nháp: ${getApiErrorMessage(failure)}`); });
    const flush = () => {
      cancelTimer();
      if (active && ready.current && latest.current.version && !pending.current && !stopped.current && dirty.current)
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
  }, [scope, options.enabled, hasVersion]);
  async function preservePending() {
    const records = await formDraftStorage.pending(scope);
    if (!records.length) throw new Error('Chưa bảo toàn được thông tin đối soát. Vui lòng kiểm tra lại.');
  }
  async function flushForExit() {
    if (!ready.current || pending.current) throw new Error('Cần kiểm tra bản nháp hoặc kết quả gửi trước khi rời.');
    cancelTimer(); await save(false); stopped.current = true;
  }
  async function discardForExit() {
    assertScope();
    if (pending.current) throw new Error('Không thể bỏ lệnh chưa xác định kết quả.');
    cancelTimer(); await formDraftStorage.remove(scope); stopped.current = true; dirty.current = false; latest.current.form.reset();
  }
  useExitProtection(() => ({
    busy: options.enabled && inFlight.current,
    pending: options.enabled && pending.current,
    dirty: options.enabled && !stopped.current && (dirty.current || options.form.formState.isDirty),
    keep: options.version && ready.current && !pending.current ? flushForExit : undefined,
    discard: discardForExit, preservePending,
    resume: () => { if (!pending.current) stopped.current = false; },
    prepareClose: () => { if (pending.current) latest.current.form.reset(latest.current.form.getValues()); },
  }));
  const draft = {
    beforeSubmit: async (command?: PendingCommand, resolvedPrevious = false) => {
      if (!latest.current.version && !command) throw new Error('Chưa có phiên bản hoặc mã lệnh để bảo toàn kết quả gửi.');
      if (!ready.current) throw new Error('Đang kiểm tra bản nháp. Vui lòng hoàn tất bước khôi phục trước khi gửi.');
      const unresolved = await formDraftStorage.pending(scope);
      const fingerprint = command ? await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, command.content) : undefined;
      if (unresolved.some(value => !(resolvedPrevious && value.scope === scope) && (!command ||
        value.operation?.commandId !== command.commandId || value.operation?.fingerprint !== fingerprint)))
        throw new Error('Có lệnh chưa được đối soát trên chứng từ này. Không thể tạo lệnh thay thế.');
      operation.current = command ? { operation: command.operation, commandId: command.commandId, fingerprint: fingerprint!,
        expectedVersion: command.expectedVersion, documentId: command.documentId, ...(command.receiptId ? { receiptId: command.receiptId } : {}) } : undefined;
      cancelTimer(); await save(true, resolvedPrevious); pending.current = true; inFlight.current = true;
    },
    // Only call after an authoritative rejection, never after a timeout or an uncertain replay.
    afterRejectedSubmit: async () => {
      await save(false, true);
      pending.current = false; dirty.current = false; operation.current = undefined; inFlight.current = false;
    },
    clear: async (resolved = false) => { cancelTimer(); await formDraftStorage.remove(scope, resolved); stopped.current = true; pending.current = false; operation.current = undefined; inFlight.current = false; },
    recordResult: async (receiptId: string) => {
      assertScope();
      if (!pending.current || !operation.current) throw new Error('Chưa có thông tin lệnh để ghi nhận phiếu đã lưu.');
      operation.current = { ...operation.current, receiptId };
      await formDraftStorage.write({ scope, version: latest.current.version ?? '', pending: true, operation: operation.current, values: {} }, assertScope);
    },
    discardAndClose: async (close: () => void) => {
      try { await discardForExit(); close(); } catch (failure) { toast.error(getApiErrorMessage(failure)); }
    },
    settled: () => { inFlight.current = false; }, flushForExit, discardForExit, preservePending,
  };
  return { ...draft,
    execute: async <Result,>(command: PendingCommand | undefined, send: () => Promise<Result>, onRejected?: () => void | Promise<void>): Promise<Result> => {
      const replay = pending.current;
      await draft.beforeSubmit(command);
      try { return await send(); }
      catch (failure) {
        // A rejection after an unknown earlier outcome is not proof that the first send failed.
        if (!replay && isApiErrorResponse(failure) && [400, 422].includes(failure.statusCode)) {
          try { await draft.afterRejectedSubmit(); }
          catch (storageFailure) {
            throw new Error(`${getApiErrorMessage(failure)} Chưa khôi phục được bản nháp để sửa: ${getApiErrorMessage(storageFailure)}`);
          }
          await onRejected?.();
        }
        throw failure;
      } finally { draft.settled(); }
    },
  };
}

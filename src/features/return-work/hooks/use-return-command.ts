import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import { useExitProtection } from '@/hooks/use-screen-exit';
import { getApiErrorMessage, isApiErrorResponse, logApiError } from '@/lib/api-error';
import { formDraftStorage } from '@/lib/form-draft-storage';
import { returnCommandSchema, type ReturnCommand } from '../return-work.schema';

interface Options {
  scope: string; supplier: boolean; documentId: string; assertCurrent: () => void;
  send: (command: ReturnCommand) => Promise<unknown>;
}
/** Persist the full original intent so lost acknowledgements can be replayed after reopening. */
export function useReturnCommand(options: Options) {
  const latest = useRef(options);
  useLayoutEffect(() => { latest.current = options; });
  const request = useRef<ReturnCommand | null>(null);
  const lock = useRef(false);
  const alive = useRef(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  useEffect(() => {
    alive.current = true;
    void (async () => {
      const entries = await formDraftStorage.pending(options.scope);
      latest.current.assertCurrent();
      if (!alive.current) return;
      if (entries.length) {
        const record = entries.length === 1 && entries[0].scope === options.scope ? entries[0] : null;
        if (!record || record.values.documentId !== options.documentId || record.values.supplier !== options.supplier)
          throw new Error('Phiếu còn thao tác từ phiên khác cần đối soát. Không tạo lệnh mới; liên hệ quản lý kiểm tra.');
        const command = returnCommandSchema.parse(record.values.command);
        const fingerprint = await digestStringAsync(CryptoDigestAlgorithm.SHA256, JSON.stringify(command));
        if (record.operation?.commandId !== command.body.commandId || record.operation.fingerprint !== fingerprint || record.operation.documentId !== options.documentId)
          throw new Error('Thông tin lệnh cần được đối soát với quản lý trước khi tiếp tục.');
        if (!alive.current) return;
        request.current = command; setPending(true);
      }
      setReady(true);
    })().catch(failure => { if (alive.current) setError(getApiErrorMessage(failure)); });
    return () => { alive.current = false; };
    // The owning workspace is keyed by account, warehouse, task and document.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.scope, recoveryAttempt]);
  useExitProtection(() => ({ busy, pending,
    preservePending: async () => { if (!(await formDraftStorage.pending(options.scope)).length) throw new Error('Chưa bảo toàn được lệnh trả hàng.'); } }));
  async function run(next?: ReturnCommand) {
    if (!ready || lock.current) return false;
    const replay = request.current !== null;
    const command = request.current ?? (next ? returnCommandSchema.parse(next) : null);
    if (!command) return false;
    lock.current = true; setBusy(true); setError(null);
    try {
      latest.current.assertCurrent();
      const fingerprint = await digestStringAsync(CryptoDigestAlgorithm.SHA256, JSON.stringify(command));
      const existing = await formDraftStorage.pending(options.scope);
      if (existing.some(entry => entry.scope !== options.scope || entry.operation?.commandId !== command.body.commandId || entry.operation.fingerprint !== fingerprint))
        throw new Error('Phiếu có thao tác chưa đối soát. Không gửi lệnh thay thế.');
      const version = command.kind === 'Manage' ? command.body.documentVersion : command.body.expectedVersion;
      await formDraftStorage.write({ scope: options.scope, version, pending: true,
        operation: { operation: command.kind === 'Manage' ? command.body.action : command.kind, commandId: command.body.commandId,
          fingerprint, expectedVersion: version, documentId: options.documentId },
        values: { supplier: options.supplier, documentId: options.documentId, command } }, () => latest.current.assertCurrent());
      request.current = command;
      if (alive.current) setPending(true);
      await latest.current.send(command);
      await formDraftStorage.remove(options.scope, true);
      request.current = null;
      if (alive.current) setPending(false);
      return true;
    } catch (failure) {
      // A new definitive rejection is safe to edit; a replay rejection cannot disprove the first send.
      if (!replay && request.current && isApiErrorResponse(failure) && failure.statusCode >= 400 && failure.statusCode < 500 && failure.statusCode !== 408) {
        try { await formDraftStorage.remove(options.scope, true); request.current = null; if (alive.current) setPending(false); }
        catch (storageFailure) { if (alive.current) setError(getApiErrorMessage(storageFailure)); return false; }
      }
      logApiError(failure);
      if (alive.current) setError(getApiErrorMessage(failure));
      return false;
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  return { ready, busy, pending, error, run, getCommand: () => request.current,
    retryRecovery: () => { if (!lock.current) { setReady(false); setError(null); setRecoveryAttempt(value => value + 1); } } };
}

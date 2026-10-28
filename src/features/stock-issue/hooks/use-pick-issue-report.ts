import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from 'react-native';
import { toast } from 'sonner-native';
import { P } from '@/config/permission-codes';
import { useFormDraft } from '@/hooks/use-form-draft';
import { formDraftStorage } from '@/lib/form-draft-storage';
import { API_BASE_URL } from '@/lib/api';
import { getApiErrorMessage, logApiError } from '@/lib/api-error';
import { reportPickIssueSchema, type StockIssueItem } from '../stock-issue.schema';
import { stockIssueApi } from '../stock-issue.api';
import type { useStockIssue } from './use-stock-issue';

type Execution = ReturnType<typeof useStockIssue>;
interface Target { key: string; version: string; stockIssueRequestItemId: string; reason: string }
export function usePickIssueReport(documentId: string, execution: Execution) {
  const latest = useRef(execution);
  useLayoutEffect(() => { latest.current = execution; });
  const client = useQueryClient();
  const lock = useRef(false);
  const [editor, setEditor] = useState<{ key: string; version: string; item: StockIssueItem } | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [attempted, setAttempted] = useState<string | null>(null);
  const storageScope = JSON.stringify([API_BASE_URL, execution.access.selection.identity, execution.access.selection.warehouseId,
    'pick-issue-attempt', documentId]);
  const form = useForm({ resolver: zodResolver(reportPickIssueSchema), defaultValues: { stockIssueRequestItemId: '', reason: '' } });
  const active = !!editor && editor.key === execution.contextKey && execution.detail.data?.version === editor.version && execution.canView &&
    execution.permission(P.STOCK_ISSUE_REQUESTS_PICK) && ['ReleasedForPicking', 'Picking'].includes(execution.detail.data.status);
  const attempt = useQuery({ queryKey: ['pick-issue-attempt', storageScope], enabled: execution.canView, retry: false,
    queryFn: () => formDraftStorage.read(storageScope) });
  const uncertain = attempted === storageScope || !!attempt.data?.pending;
  const guard = (original: Pick<Target, 'key' | 'version'>) => latest.current.assertFieldReport(original.key, original.version);
  const draft = useFormDraft({ form, feature: 'pick-issue-report', documentId, lineId: editor?.item.id,
    version: editor?.version, enabled: active, assertCurrent: () => { if (!editor) throw new Error('Biểu mẫu đã đóng.'); guard(editor); } });
  const mutation = useMutation<unknown, Error, Target>({ retry: false, mutationFn: async (original: Target) => {
    guard(original);
    if (uncertain || attempted === storageScope || !attempt.isSuccess || attempt.isFetching) throw new Error('Hãy kiểm tra kết quả báo cáo trước khi gửi thêm.');
    const fresh = await stockIssueApi.detail(documentId, execution.access.selection.warehouseId!, execution.access.profile.data!.id);
    guard(original);
    if (fresh.version !== original.version) throw new Error('Phiếu đã thay đổi. Vui lòng tải lại.');
    return draft.execute(undefined, async () => {
      guard(original);
      await formDraftStorage.write({ scope: storageScope, version: original.version, values: {}, pending: true }, () => guard(original));
      guard(original); setAttempted(storageScope);
      return stockIssueApi.reportIssue(documentId, { stockIssueRequestItemId: original.stockIssueRequestItemId, reason: original.reason }, () => guard(original));
    }, async () => {
      await formDraftStorage.remove(storageScope, true); setAttempted(null); setTarget(null);
      await client.invalidateQueries({ queryKey: ['pick-issue-attempt', storageScope] });
    });
  }, onSettled: () => draft.settled(), onError: logApiError, onSuccess: async (_, original) => {
    if (latest.current.contextKey !== original.key) return;
    await formDraftStorage.remove(storageScope, true);
    await draft.clear(true); setAttempted(null); setTarget(null); setEditor(null);
    toast.success('Đã gửi báo cáo sự cố cho người lập phiếu. Tồn kho chưa thay đổi.');
    await client.invalidateQueries({ queryKey: ['pick-issue-attempt', storageScope] });
    await client.invalidateQueries({ queryKey: ['notifications'] });
    await client.invalidateQueries({ queryKey: ['audit-logs'] });
  } });
  function close() {
    if (!lock.current) { setEditor(null); setTarget(null); }
  }
  return { form, active, uncertain: uncertain && !mutation.isPending, attempt, error: error ?? mutation.error, mutation, target: active ? target : null, close,
    canReadAudit: execution.permission(P.AUDIT_LOGS_VIEW),
    closeToAudit: close,
    open: (item: StockIssueItem) => {
      try {
        const version = execution.detail.data?.version ?? ''; execution.assertFieldReport(execution.contextKey, version);
        mutation.reset(); setError(null); setTarget(null); form.reset({ stockIssueRequestItemId: item.id, reason: `${item.sku}: ` });
        setEditor({ key: execution.contextKey, version, item });
      } catch (failure) { setError(new Error(getApiErrorMessage(failure))); }
    },
    review: () => form.handleSubmit(values => {
      try {
        if (!editor || !active || uncertain || !attempt.isSuccess || attempt.isFetching) throw new Error('Kiểm tra lần gửi trước trước khi lập báo cáo mới.');
        guard(editor); setTarget({ key: editor.key, version: editor.version, ...values }); setError(null);
      } catch (failure) { setError(new Error(getApiErrorMessage(failure))); }
    })(),
    cancel: () => { if (!lock.current) setTarget(null); },
    confirm: async () => {
      if (!target || lock.current || uncertain) return;
      lock.current = true;
      try { await mutation.mutateAsync(target); } catch { /* Legacy command has no idempotency key; never replay automatically. */ }
      finally { lock.current = false; }
    },
    acknowledge: () => Alert.alert('Cần đối soát kết quả',
      'Hãy kiểm tra nhật ký và liên hệ quản lý để xác minh báo cáo. Đóng thông báo không xóa lệnh chưa xác định và không mở lại việc gửi báo cáo trùng.', [{ text: 'Đã hiểu' }]),
  };
}

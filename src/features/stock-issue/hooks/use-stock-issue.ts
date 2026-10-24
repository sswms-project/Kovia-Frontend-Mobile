import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useFormDraft } from '@/hooks/use-form-draft';

import { P, type PermissionCode } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { taskScopeMatches, type TaskScope } from '@/features/my-tasks/my-tasks';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { getApiErrorMessage, logApiError } from '@/lib/api-error';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { assertPick } from '../stock-issue';
import { stockIssueApi } from '../stock-issue.api';
import { pickFormSchema, reportPickIssueFormSchema, type PickForm, type StockIssueItem } from '../stock-issue.schema';

interface Target { key: string; version: string; action: 'Pick' | 'ReportIssue' | 'AuthorizeDispatch' | 'Dispatch'; values?: PickForm; reason?: string }
export function useStockIssue(documentId: string) {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const validId = nonEmptyDotNetGuidSchema('Mã phiếu xuất không hợp lệ.').safeParse(documentId).success;
  const canView = access.ready && validId && !!access.profile.data?.permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW);
  const { identity, warehouseId, revision, signature } = access.selection;
  const scope: TaskScope | null = canView && identity && warehouseId && signature ? { identity, warehouseId, revision, signature } : null;
  const prefix = ['warehouse', identity, warehouseId, revision, 'stock-issue', documentId];
  const contextKey = JSON.stringify([...prefix, signature]);
  const userId = access.profile.data?.id ?? '';
  const detail = useQuery({ queryKey: [...prefix, 'detail'], enabled: !!scope, retry: false,
    queryFn: ({ signal }) => stockIssueApi.detail(documentId, scope!.warehouseId, userId, signal) });
  const [editor, setEditor] = useState<{ key: string; version: string; item: StockIssueItem; slotCode: string } | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const [report, setReport] = useState<{ key: string; version: string } | null>(null);
  const lock = useRef(false);
  const form = useForm<PickForm>({ resolver: zodResolver(pickFormSchema), defaultValues: { stockIssueRequestItemId: '',
    inventoryStockId: '', pickedQuantity: Number.NaN, scannedBarcode: '', scannedSlotCode: '' } });
  const permission = (value: PermissionCode) => canView && !!access.profile.data?.permissions.includes(value);
  const status = detail.data?.status;
  const ready = canView && !!detail.data && !detail.isError && !detail.isFetching;
  const allowed = (action: string) => ready && ((action === 'Pick' || action === 'ReportIssue') ? status === 'ReleasedForPicking' || status === 'Picking'
    : action === 'AuthorizeDispatch' ? status === 'Picked' : action === 'Dispatch' && status === 'AuthorizedForDispatch');
  function assertCurrent(permissionCode: PermissionCode) {
    const profile = client.getQueryData<UserProfile>(profileQueryKey);
    const snapshot = profile ? warehouseSnapshot(profile) : null;
    if (!scope || !taskScopeMatches(scope, useWarehouseSelection.getState()) || !useAuth.getState().signedIn ||
      !snapshot?.activeUser || !snapshot.compatible || snapshot.identity !== scope.identity || snapshot.signature !== scope.signature ||
      !snapshot.warehouses.some(warehouse => warehouse.id === scope.warehouseId) ||
      !profile?.permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW) || !profile.permissions.includes(permissionCode))
      throw new Error('Kho, tài khoản hoặc quyền đã thay đổi. Vui lòng mở lại công việc.');
  }
  const draft = useFormDraft({ form, feature: 'issue-pick', documentId, lineId: editor ? `${editor.item.id}:${form.getValues('inventoryStockId')}` : undefined,
    version: editor?.version, enabled: editor?.key === contextKey && permission(P.STOCK_ISSUE_REQUESTS_PICK),
    assertCurrent: () => { assertCurrent(P.STOCK_ISSUE_REQUESTS_PICK); if (detail.data?.version !== editor?.version) throw new Error('Phiếu xuất đã thay đổi.'); } });
  const mutation = useMutation<unknown, Error, Target>({ retry: false, mutationFn: async (original: Target) => {
    const permissionCode = original.action === 'Pick' || original.action === 'ReportIssue' ? P.STOCK_ISSUE_REQUESTS_PICK
      : original.action === 'AuthorizeDispatch' ? P.STOCK_ISSUE_REQUESTS_AUTHORIZE_DISPATCH : P.STOCK_ISSUE_REQUESTS_DISPATCH;
    const assertCurrentContext = () => {
      assertCurrent(permissionCode);
      if (original.key !== contextKey || !allowed(original.action) || detail.data?.version !== original.version)
        throw new Error('Dữ liệu đã thay đổi. Vui lòng tải lại phiếu trước khi tiếp tục.');
    };
    assertCurrentContext();
    if (original.action === 'Pick') {
      await draft.beforeSubmit();
      const values = pickFormSchema.parse(original.values);
      assertPick(values, detail.data!);
      return stockIssueApi.pick(documentId, { items: [values] }, assertCurrentContext);
    }
    if (original.action === 'ReportIssue') return stockIssueApi.reportPickIssue(documentId, reportPickIssueFormSchema.parse({ reason: original.reason }).reason, assertCurrentContext);
    if (original.action === 'AuthorizeDispatch') return stockIssueApi.authorizeDispatch(documentId, assertCurrentContext);
    return stockIssueApi.dispatch(documentId, assertCurrentContext);
  }, onError: logApiError, onSuccess: async (_, original) => {
    if (original.key !== contextKey) return;
    if (original.action === 'Pick') await draft.clear();
    setTarget(null); setEditor(null); setReport(null); form.reset();
    setNotice(original.action === 'Pick' ? 'Đã ghi nhận lấy hàng.'
      : original.action === 'ReportIssue' ? 'Đã gửi báo cáo hàng lỗi cho chủ doanh nghiệp.'
      : original.action === 'AuthorizeDispatch' ? 'Đã cho phép xuất kho.' : 'Đã xác nhận xuất kho.');
    await client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision] });
  } });
  function beginPick(item: StockIssueItem, inventoryStockId: string) {
    const location = item.pickLocations.find(value => value.inventoryStockId === inventoryStockId);
    if (!location || !allowed('Pick') || lock.current) return;
    mutation.reset(); setNotice(null); setDiscard(false);
    try {
      assertCurrent(P.STOCK_ISSUE_REQUESTS_PICK);
      form.reset({ stockIssueRequestItemId: item.id, inventoryStockId, pickedQuantity: Number.NaN, scannedBarcode: '', scannedSlotCode: '' });
      setEditor({ key: contextKey, version: detail.data?.version ?? '', item, slotCode: location.slotCode });
    } catch (error) { logApiError(error); setNotice(getApiErrorMessage(error)); }
  }
  async function reviewPick() {
    await form.handleSubmit(values => {
      if (editor?.key !== contextKey || lock.current) return;
      try {
        assertPick(values, detail.data!);
        setTarget({ key: contextKey, version: editor.version, action: 'Pick', values });
      }
      catch (error) { setNotice(error instanceof Error ? error.message : 'Dữ liệu chưa hợp lệ.'); }
    })();
  }
  function begin(action: 'AuthorizeDispatch' | 'Dispatch') {
    if (!detail.data || !allowed(action) || lock.current) return;
    mutation.reset(); setNotice(null);
    setTarget({ key: contextKey, version: detail.data.version ?? '', action });
  }
  function openReport() {
    if (!detail.data || !allowed('ReportIssue') || !permission(P.STOCK_ISSUE_REQUESTS_PICK) || lock.current) return;
    mutation.reset(); setNotice(null); setReport({ key: contextKey, version: detail.data.version ?? '' });
  }
  async function submitReport(reason: string) {
    if (!report || report.key !== contextKey || lock.current) return;
    lock.current = true;
    try { await mutation.mutateAsync({ key: contextKey, version: report.version, action: 'ReportIssue', reason }); }
    catch { /* The dialog stays open so the error can be shown. */ }
    finally { lock.current = false; }
  }
  async function confirm() {
    if (!target || target.key !== contextKey || lock.current) return;
    lock.current = true;
    try { await mutation.mutateAsync(target); } catch { /* The confirmation stays open so the error can be shown. */ }
    finally { lock.current = false; }
  }
  return { access, validId, canView, detail, form, allowed, permission, mutation, notice,
    contextKey, editor: editor?.key === contextKey ? editor : null, target: target?.key === contextKey ? target : null,
    report: report?.key === contextKey ? report : null, openReport, submitReport, closeReport: () => { if (!lock.current) setReport(null); },
    discard, setDiscard, beginPick, reviewPick, beginAuthorize: () => begin('AuthorizeDispatch'), beginDispatch: () => begin('Dispatch'), confirm,
    refresh: async () => { await client.invalidateQueries({ queryKey: prefix }); },
    closeEditor: () => { if (!lock.current) { if (form.formState.isDirty) setDiscard(true); else setEditor(null); } },
    discardChanges: () => { if (!lock.current) { void draft.clear(); setEditor(null); setDiscard(false); form.reset(); } },
    cancelConfirmation: () => { if (!lock.current) setTarget(null); } };
}

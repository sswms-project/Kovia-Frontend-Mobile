import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useEffect, useState } from 'react';
import { useForm, useFormState } from 'react-hook-form';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { taskScopeMatches } from '@/features/my-tasks/my-tasks';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey, warehouseSnapshot } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { useExitProtection } from '@/hooks/use-screen-exit';
import { API_BASE_URL } from '@/lib/api';
import { formDraftStorage } from '@/lib/form-draft-storage';
import { getApiErrorMessage } from '@/lib/api-error';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';
import { taskActionReasonSchema, type TaskActionReasonFormValues } from '@/features/warehouse-task/warehouse-task.schema';
import { returnWorkApi } from '../return-work.api';
import { assertCustomerReturn, assertReturnWork, assertSupplierReturn, confirmedReturnData, hasReturnPermissions } from '../return-work';
import { conditionSchema, returnFormSchema, type ReturnCommand, type ReturnForm } from '../return-work.schema';
import { useReturnCommand } from './use-return-command';

export function useReturnTask(supplier: boolean, taskId: string) {
  const access = useWarehouseAccess();
  const canView = access.ready && hasReturnPermissions(supplier, access.profile.data);
  const { identity, warehouseId, signature, revision } = access.selection;
  const validId = nonEmptyDotNetGuidSchema('Mã công việc không hợp lệ.').safeParse(taskId).success;
  const query = useQuery({ queryKey: ['warehouse', identity, warehouseId, revision, 'return-task', supplier, taskId],
    enabled: canView && validId, retry: false, staleTime: 0,
    queryFn: async ({ signal }) => {
      const recovery = await formDraftStorage.pendingReturnTask([API_BASE_URL, identity!, warehouseId!], taskId, supplier);
      if (recovery) return { sourceDocumentId: nonEmptyDotNetGuidSchema('Mã phiếu phục hồi không hợp lệ.').parse(recovery.documentId) };
      return assertReturnWork(await returnWorkApi.mine(supplier, taskId, signal), taskId, warehouseId!, access.profile.data!.id);
    } });
  return { access, query, canView, validId, contextKey: JSON.stringify([identity, warehouseId, signature, revision, supplier, taskId]) };
}

export function useReturnWork(supplier: boolean, taskId: string, documentId: string, taskFresh = true) {
  const access = useWarehouseAccess(); const client = useQueryClient();
  const { identity, warehouseId, signature, revision } = access.selection;
  const scope = { identity: identity!, warehouseId: warehouseId!, signature: signature!, revision };
  function assertCurrent() {
    const profile = client.getQueryData<UserProfile>(profileQueryKey);
    const snapshot = profile ? warehouseSnapshot(profile) : null;
    if (!useAuth.getState().signedIn || !access.ready || !taskScopeMatches(scope, useWarehouseSelection.getState()) ||
      !snapshot?.activeUser || !snapshot.compatible || snapshot.signature !== signature || snapshot.identity !== identity ||
      !snapshot.warehouses.some(item => item.id === warehouseId) || !hasReturnPermissions(supplier, profile))
      throw new Error('Kho, tài khoản hoặc quyền trả hàng đã thay đổi. Mở lại công việc trước khi tiếp tục.');
  }
  const prefix = ['warehouse', identity, warehouseId, revision, 'return-work', supplier, taskId, documentId];
  const query = useQuery({ queryKey: prefix, retry: false, staleTime: 0,
    enabled: access.ready && hasReturnPermissions(supplier, access.profile.data),
    queryFn: async ({ signal }) => {
      assertCurrent();
      const work = assertReturnWork(await returnWorkApi.mine(supplier, taskId, signal), taskId, warehouseId!, access.profile.data!.id);
      if (work.sourceDocumentId !== documentId) throw new Error('Phiếu nguồn của công việc đã thay đổi.');
      const document = supplier ? await returnWorkApi.supplier(documentId, signal) : await returnWorkApi.customer(documentId, signal);
      const options = !supplier && work.canComplete ? await returnWorkApi.options(documentId, signal) : null;
      assertCurrent();
      if (document.id !== documentId || work.documentVersion !== document.version || (options && options.version !== document.version) ||
        ('warehouseId' in document && document.warehouseId !== warehouseId)) throw new Error('Phiếu vừa thay đổi. Tải lại trước khi thao tác.');
      return { work, document, options };
    } });
  const [snapshot, setSnapshot] = useState<typeof query.data>(undefined);
  const [confirmation, setConfirmation] = useState<ReturnCommand | null>(null);
  const [reasonAction, setReasonAction] = useState<'Pause' | 'Return' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const form = useForm<ReturnForm>({ resolver: zodResolver(returnFormSchema), defaultValues: { items: [], lines: [] } });
  const { isDirty } = useFormState({ control: form.control });
  const reasonForm = useForm<TaskActionReasonFormValues>({ resolver: zodResolver(taskActionReasonSchema), defaultValues: { reason: '' } });
  const command = useReturnCommand({ scope: JSON.stringify([API_BASE_URL, identity, warehouseId, 'return-work', documentId]),
    supplier, documentId, assertCurrent, send: request => returnWorkApi.send(supplier, documentId, request, assertCurrent) });
  function defaults(data: NonNullable<typeof query.data>): ReturnForm {
    return { items: 'goodsReturnRequestCode' in data.document ? data.document.items.map(item => ({ returnItemId: item.id,
      condition: conditionSchema.parse(item.actualCondition ?? item.condition), restockSlotId: (item.actualCondition ?? item.condition) === 'Scrap' ? null : item.restockSlotId, scannedSlotCode: null })) : [],
    lines: 'code' in data.document ? data.document.items.map(item => ({ itemId: item.id, deliveredQuantity: item.deliveredQuantity ?? item.quantity,
      scannedSlotCode: null, scannedProductCode: null })) : [] };
  }
  function load(data: NonNullable<typeof query.data>) { form.reset(defaults(data)); setSnapshot(data); setNotice(null); }
  if (!snapshot && query.data) setSnapshot(query.data);
  useEffect(() => {
    if (snapshot) form.reset(defaults(snapshot));
    // Synchronize the external form only when the user explicitly replaces its snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, form]);
  const conflict = !!snapshot && !!query.data && (snapshot.work.documentVersion !== query.data.work.documentVersion || snapshot.work.taskVersion !== query.data.work.taskVersion);
  const fresh = taskFresh && query.isSuccess && !query.isFetching && !conflict;
  const locked = command.busy || command.pending || !command.ready || !fresh || completed;
  const canEdit = !locked && !!snapshot?.work.canComplete && snapshot.work.executionStatus === 'InProgress';
  useExitProtection(() => ({ busy: command.busy, dirty: !completed && !command.pending && isDirty,
    discard: async () => { form.reset(); } }));
  function proof() {
    assertCurrent();
    if (!fresh || !snapshot?.work.taskId || !snapshot.work.taskVersion) throw new Error('Tải lại công việc trước khi thao tác.');
    return { expectedVersion: snapshot.work.documentVersion, taskId: snapshot.work.taskId, taskVersion: snapshot.work.taskVersion, commandId: randomUUID() };
  }
  function manage(action: 'Start' | 'Pause' | 'Return', reason?: string) {
    if (locked || !snapshot?.work.canManage) return;
    try {
      const versions = proof();
      const request: ReturnCommand = { kind: 'Manage', body: { taskId: versions.taskId, taskVersion: versions.taskVersion,
        documentVersion: versions.expectedVersion, commandId: versions.commandId, action, reason: reason?.trim() || null } };
      void execute(request);
    } catch (failure) { setNotice(getApiErrorMessage(failure)); }
  }
  async function review() {
    if (!canEdit || !snapshot) return;
    await form.handleSubmit(values => {
      try {
        const versions = proof();
        if ('code' in snapshot.document) {
          assertSupplierReturn(snapshot.document, values);
          setConfirmation({ kind: 'Supplier', body: { ...versions, lines: values.lines } });
        } else {
          if (!snapshot.options) throw new Error('Chưa tải được vị trí cất hàng.');
          assertCustomerReturn(snapshot.document, snapshot.options, values);
          setConfirmation({ kind: 'Customer', body: { ...versions, items: values.items } });
        }
      } catch (failure) { setNotice(getApiErrorMessage(failure)); }
    }, () => setNotice('Kiểm tra các dòng hàng: số lượng, tình trạng và mã vị trí trước khi hoàn tất.'))();
  }
  async function confirm(retry = false) {
    const original = retry ? command.getCommand() : confirmation;
    if (!original || (!retry && locked)) return;
    await execute(original);
  }
  async function execute(original: ReturnCommand) {
    const accepted = await command.run(original);
    setReasonAction(null);
    if (!accepted) return;
    setConfirmation(null); form.reset(form.getValues());
    const terminal = original.kind !== 'Manage' || original.body.action === 'Return';
    if (terminal) {
      if (snapshot && original.kind !== 'Manage') setSnapshot(confirmedReturnData(snapshot, original));
      setCompleted(true); setNotice(original.kind === 'Manage' ? 'Đã trả công việc về quản lý.' : supplier ? 'Đã ghi nhận hàng giao trả nhà cung cấp.' : 'Đã nhận và cất hàng khách trả.');
    }
    // Writes are acknowledged before refreshing. A failed read is never shown as a failed write.
    await Promise.all([client.invalidateQueries({ queryKey: ['warehouse', identity, warehouseId, revision], refetchType: 'none' }),
      client.invalidateQueries({ queryKey: ['notifications'] }), client.invalidateQueries({ queryKey: ['goods-return-requests'] })]);
    if (!terminal) {
      const result = await query.refetch();
      if (result.data && !result.isError) load(result.data);
      setNotice(original.kind === 'Manage' && original.body.action === 'Pause' ? 'Đã tạm dừng công việc. Nội dung chưa xác nhận chưa được ghi nhận vào tồn kho.' : 'Đã bắt đầu công việc. Kiểm tra từng dòng hàng bên dưới.');
    }
  }
  return { access, query, data: snapshot, form, reasonForm, reasonAction, setReasonAction, command, confirmation,
    setConfirmation, notice, conflict, locked, canEdit, completed, isDirty, review, manage, confirm,
    reload: async () => { if (command.busy || command.pending) return; if (!command.ready) command.retryRecovery();
      const result = await query.refetch(); if (result.data && !result.isError) load(result.data); },
    openReason: (action: 'Pause' | 'Return') => { reasonForm.reset({ reason: '' }); setReasonAction(action); },
  };
}

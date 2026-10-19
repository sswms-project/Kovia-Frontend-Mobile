import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { P } from '@/config/permission-codes';
import { useAuth } from '@/features/auth/auth.store';
import type { UserProfile } from '@/features/auth/auth.types';
import { useWarehouseAccess } from '@/features/warehouse-access/hooks/use-warehouse-access';
import { profileQueryKey, warehouseQueryKey } from '@/features/warehouse-access/warehouse-access';
import { useWarehouseSelection } from '@/features/warehouse-access/warehouse-access.store';
import { logApiError } from '@/lib/api-error';

import { myTasksApi } from '../my-tasks.api';
import { ACTION_LABELS, assertTaskActionScope, taskScopeMatches, type TaskScope } from '../my-tasks';
import { taskActionSchema, type TaskActionInput, type TaskFilters, type WarehouseTask,
  type WarehouseTaskList } from '../my-tasks.schema';

export function useMyTasks() {
  const access = useWarehouseAccess();
  const client = useQueryClient();
  const [filters, setFilters] = useState<TaskFilters>({ history: false, recentlyAssignedFirst: false, pageNumber: 1 });
  const [target, setTarget] = useState<{ task: WarehouseTask; action: TaskActionInput['action'] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const submitLock = useRef(false);
  const canView = access.ready && !!access.profile.data?.permissions.includes(P.WAREHOUSE_TASKS_VIEW_OWN);
  const canManage = canView && !!access.profile.data?.permissions.includes(P.WAREHOUSE_TASKS_MANAGE_OWN);
  const scope = useMemo<TaskScope | null>(() => {
    const { identity, warehouseId, revision, signature } = access.selection;
    return canView && identity && warehouseId && signature ? { identity, warehouseId, revision, signature } : null;
  }, [canView, access.selection]);
  const key = scope ? warehouseQueryKey('my-tasks', filters) : ['warehouse', 'disabled', 'my-tasks'];
  const list = useQuery({
    queryKey: key,
    enabled: !!scope,
    queryFn: ({ signal }) => {
      if (!scope || !access.profile.data) throw new Error('Chọn kho và xác minh quyền trước khi tải công việc.');
      return myTasksApi.list(scope.warehouseId, access.profile.data.id, filters, signal);
    },
    staleTime: 15_000,
    refetchInterval: scope ? 30_000 : false,
    retry: (count, error) => count < 1 && !('statusCode' in error && [401, 403, 404].includes(Number(error.statusCode))),
  });
  const form = useForm<TaskActionInput>({ resolver: zodResolver(taskActionSchema), defaultValues: { action: 'Start', reason: '' } });
  const mutation = useMutation({
    retry: false,
    mutationFn: async ({ task, input, originalScope }: { task: WarehouseTask; input: TaskActionInput; originalScope: TaskScope }) => {
      const assertCurrentContext = () => {
        if (!taskScopeMatches(originalScope, useWarehouseSelection.getState()))
          throw new Error('Kho đã thay đổi. Vui lòng chọn lại công việc.');
        const profile = client.getQueryData<UserProfile>(profileQueryKey);
        assertTaskActionScope(originalScope, task, input.action, profile, useAuth.getState().signedIn);
        const current = client.getQueryData<WarehouseTaskList>(key)?.items.find(
          (candidate) => candidate.id === task.id && candidate.taskType === task.taskType,
        );
        const state = client.getQueryState(key);
        if (state?.status !== 'success' || state.fetchStatus !== 'idle' || !current || current.executionStatus !== task.executionStatus)
          throw new Error('Công việc đã thay đổi. Vui lòng tải lại trước khi thao tác.');
      };
      assertCurrentContext();
      return myTasksApi.action(task.taskType, task.id, input, assertCurrentContext);
    },
    onSuccess: async (_, variables) => {
      if (taskScopeMatches(variables.originalScope, useWarehouseSelection.getState()))
        await client.invalidateQueries({ queryKey: ['warehouse', variables.originalScope.identity,
          variables.originalScope.warehouseId, variables.originalScope.revision, 'my-tasks'] });
    },
    onError: (error, variables) => {
      logApiError(error);
      if (taskScopeMatches(variables.originalScope, useWarehouseSelection.getState()))
        void client.invalidateQueries({ queryKey: ['warehouse', variables.originalScope.identity,
          variables.originalScope.warehouseId, variables.originalScope.revision, 'my-tasks'] });
    },
  });

  function changeFilters(patch: Partial<TaskFilters>) {
    if (submitLock.current) return;
    setNotice(null);
    setTarget(null);
    mutation.reset();
    setFilters((previous) => ({ ...previous, ...patch, pageNumber: patch.pageNumber ?? 1 }));
  }
  function beginAction(task: WarehouseTask, action: TaskActionInput['action']) {
    if (!canManage || !scope || list.isError || submitLock.current) return;
    setNotice(null);
    mutation.reset();
    form.reset({ action, reason: '' });
    setTarget({ task, action });
  }
  async function confirmAction() {
    await form.handleSubmit(async (input) => {
    if (!scope || !target || submitLock.current) return;
    submitLock.current = true;
    try {
      await mutation.mutateAsync({ task: target.task, input, originalScope: scope });
      if (taskScopeMatches(scope, useWarehouseSelection.getState())) {
        setTarget(null);
        form.reset({ action: 'Start', reason: '' });
        setNotice(input.action === 'Return' ? 'Đã trả việc về quản lý. Công việc không còn trong danh sách được giao cho bạn.'
          : `Đã ${ACTION_LABELS[input.action].toLocaleLowerCase('vi')} công việc. Danh sách đã được yêu cầu cập nhật.`);
      }
    } catch {
      // The modal keeps the server error and entered reason for recovery.
    } finally {
      submitLock.current = false;
    }
    })();
  }
  return { access, filters, changeFilters, scope, canView, canManage, list, target, form, mutation,
    notice, beginAction, confirmAction, closeAction: () => { if (!submitLock.current) setTarget(null); } };
}

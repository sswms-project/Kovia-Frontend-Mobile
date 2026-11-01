import { useEffect, useRef } from 'react';

import { USER_ROLES } from '@/config/roles';
import { useMe } from '@/features/auth/hooks/use-me';
import { speak } from '@/lib/speech';
import { useSpeechPreference } from '@/stores/speech.store';

import { TASK_TYPE_LABEL } from '../warehouse-task.labels';
import type { MyWarehouseTask } from '../warehouse-task.types';
import { flattenTasks, useMyWarehouseTasksQuery } from './use-my-warehouse-tasks';

export function buildNewTaskSpeech(tasks: readonly Pick<MyWarehouseTask, 'taskType'>[]): string {
  if (tasks.length === 1) return `Bạn có công việc mới: ${TASK_LABEL(tasks[0].taskType)}.`;
  return `Bạn có ${tasks.length} công việc mới.`;
}

const TASK_LABEL = (type: MyWarehouseTask['taskType']) => TASK_TYPE_LABEL[type] ?? 'công việc';

/** Nhân viên kho: đọc to mỗi khi có công việc mới được giao (bỏ qua lần tải đầu tiên). */
export function useNewTaskAnnouncer() {
  const isStaff = useMe().data?.role === USER_ROLES.WarehouseStaff;
  const enabled = useSpeechPreference(s => s.autoReadAlerts && s.hydrated);
  const query = useMyWarehouseTasksQuery({});
  const warehouseId = query.workspace.scope?.warehouseId ?? null;
  const seen = useRef<{ warehouseId: string | null; ids: Set<string> } | null>(null);

  useEffect(() => {
    if (!isStaff || !query.data || !warehouseId) return;
    const tasks = flattenTasks(query.data);
    if (!seen.current || seen.current.warehouseId !== warehouseId) {
      seen.current = { warehouseId, ids: new Set(tasks.map(t => t.id)) };
      return;
    }
    const fresh = tasks.filter(t => !seen.current!.ids.has(t.id));
    fresh.forEach(t => seen.current!.ids.add(t.id));
    if (enabled && fresh.length > 0) speak(buildNewTaskSpeech(fresh));
  }, [isStaff, enabled, query.data, warehouseId]);
}

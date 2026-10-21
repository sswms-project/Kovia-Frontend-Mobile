import type { Href } from 'expo-router';

import { P } from '@/config/permission-codes';
import type { UserProfile } from '@/features/auth/auth.types';

import type { MyWarehouseTask } from './warehouse-task.types';

export function getTaskReference(task: MyWarehouseTask, profile: UserProfile): Href | null {
  if (task.assignedTo !== profile.id) return null;
  if (task.taskType === 'Receiving' && profile.permissions.includes(P.INBOUND_REQUESTS_VIEW))
    return { pathname: '/catalog/inbound-requests/[requestId]', params: { requestId: task.id } };
  if (task.taskType === 'Picking' && profile.permissions.includes(P.STOCK_ISSUE_REQUESTS_VIEW))
    return { pathname: '/catalog/stock-issue-requests/[requestId]', params: { requestId: task.id } };
  return null;
}

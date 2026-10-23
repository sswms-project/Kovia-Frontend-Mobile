import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

const id = nonEmptyDotNetGuidSchema('Mã thông báo không hợp lệ.');
export const notificationSchema = z.object({ id, type: z.string(), title: z.string(), message: z.string(), isRead: z.boolean(),
  referenceType: z.string().nullable(), referenceId: id.nullable(), action: z.string().nullable(), createdAt: z.string().datetime({ offset: true }) });
export const notificationListSchema = z.object({ items: z.array(notificationSchema), totalCount: z.number().int().nonnegative(),
  pageNumber: z.number().int().positive(), pageSize: z.number().int().positive() });
export const notificationFilterSchema = z.object({ search: z.string().trim().max(255, 'Từ khóa tối đa 255 ký tự.') });
export type WarehouseNotification = z.infer<typeof notificationSchema>;
export type NotificationFilter = z.infer<typeof notificationFilterSchema>;

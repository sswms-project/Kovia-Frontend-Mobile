import { z } from 'zod';

const guid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
export const auditLogChangeSchema = z.object({ label: z.string(), before: z.string().nullable(), after: z.string().nullable() });
export const auditLogSchema = z.object({
  id: guid, tenantId: guid.nullable(), warehouseId: guid.nullable(), warehouseCode: z.string().nullable(), warehouseName: z.string().nullable(),
  userId: guid, actorName: z.string(), actorEmail: z.string(), action: z.string(), actionLabel: z.string(),
  entityType: z.string(), entityTypeLabel: z.string(), entityId: guid, referenceDisplay: z.string(),
  summary: z.string(), description: z.string(), reason: z.string().nullable(), oldValue: z.string().nullable(), newValue: z.string().nullable(),
  changes: z.array(auditLogChangeSchema), createdAt: z.string(),
});
export const auditLogPageSchema = z.object({ items: z.array(auditLogSchema), totalCount: z.number().int().nonnegative(),
  pageNumber: z.number().int().positive(), pageSize: z.number().int().positive() });

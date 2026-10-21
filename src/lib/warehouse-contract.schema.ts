import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from './dotnet-guid.schema';

const id = nonEmptyDotNetGuidSchema('Mã dữ liệu không hợp lệ.');
export const warehouseActionsSchema = z.object({ allowedActions: z.array(z.string()), selfApprovalRequired: z.boolean(),
  currentVersion: z.string().nullable(), denialReasonCode: z.string().nullable() });
export const warehouseEvidenceSchema = z.object({ id, warehouseId: id, fileName: z.string(), contentType: z.string(),
  fileSize: z.number().finite().nonnegative(), uploadedByUserId: id, createdAt: z.string(),
  referenceType: z.string().nullable(), referenceId: id.nullable() });

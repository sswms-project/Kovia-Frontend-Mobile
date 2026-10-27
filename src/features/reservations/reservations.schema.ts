import { z } from 'zod';

import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { RESERVATION_STATUSES } from './reservations.types';

const id = nonEmptyDotNetGuidSchema('Mã giữ chỗ không hợp lệ.');

export const reservationStatusSchema = z.enum(RESERVATION_STATUSES);

export const reservationListSchema = z.object({
  pageNumber: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalCount: z.number().int().nonnegative(),
  items: z.array(z.object({
    id, productId: id, productSku: z.string(), productName: z.string(), warehouseId: id,
    slotCode: z.string(), lotNumber: z.string().nullish().transform((value) => value ?? null),
    referenceType: z.string(), referenceCode: z.string().nullish().transform((value) => value ?? null),
    reservedQuantity: z.number().finite(), status: reservationStatusSchema,
    createdByName: z.string().nullish().transform((value) => value ?? null),
    releasedAt: z.string().nullish().transform((value) => value ?? null), createdAt: z.string(),
  })),
});

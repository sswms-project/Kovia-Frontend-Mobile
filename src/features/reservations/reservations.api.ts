import { ApiError, api, unwrap, type ApiResponse } from '@/lib/api';

import { reservationListSchema } from './reservations.schema';
import type { ReservationListQuery } from './reservations.types';

export const reservationsApi = {
  getReservations: async (params: ReservationListQuery, signal?: AbortSignal) => {
    const data = reservationListSchema.parse(unwrap(await api.get<ApiResponse<unknown>>('/inventory/reservations', { params, signal })));
    if (data.pageNumber !== params.pageNumber || data.pageSize > params.pageSize || data.items.length > data.pageSize)
      throw new ApiError('Phân trang giữ chỗ không hợp lệ. Vui lòng tải lại.', 422);
    if (data.items.some((reservation) => reservation.warehouseId.toLowerCase() !== params.warehouseId.toLowerCase()))
      throw new ApiError('Dữ liệu giữ chỗ không khớp kho đang xem.', 403);
    return data;
  },
};

import { api, unwrap, type ApiResponse } from '@/lib/api';
import { nonEmptyDotNetGuidSchema } from '@/lib/dotnet-guid.schema';

import { warehouseMapSchema } from './warehouse-map';

export const warehouseMapApi = {
  get: async (warehouseId: string, signal?: AbortSignal) => {
    nonEmptyDotNetGuidSchema('Vui lòng chọn kho.').parse(warehouseId);
    const parsed = warehouseMapSchema.safeParse(unwrap(await api.get<ApiResponse<unknown>>(
      `/warehouses/${warehouseId}/layout/scene`, { signal })));
    if (!parsed.success) throw new Error('Sơ đồ chưa đủ dữ liệu để hiển thị. Vui lòng kiểm tra sơ đồ và thử lại.');
    const scene = parsed.data;
    if (scene.warehouseId.toLowerCase() !== warehouseId.toLowerCase())
      throw new Error('Sơ đồ không thuộc kho đang chọn. Vui lòng tải lại.');
    return scene;
  },
};

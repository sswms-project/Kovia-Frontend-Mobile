import { api, unwrap, type ApiResponse } from '@/lib/api';

import type { CategoryItem, ReferenceStatus, UnitItem } from './reference-data.types';

// Both endpoints return the whole flat list without paging; filtering by text is done on the device.
export const referenceDataApi = {
  getUnits: (status: ReferenceStatus) =>
    api.get<ApiResponse<UnitItem[]>>('/units', { params: { status } }).then(unwrap),
  getCategories: (status: ReferenceStatus) =>
    api.get<ApiResponse<CategoryItem[]>>('/categories', { params: { status } }).then(unwrap),
};

export type ReferenceStatus = 'Active' | 'Inactive';

export const REFERENCE_STATUS_LABEL: Readonly<Record<string, string>> = {
  Active: 'Đang hoạt động',
  Inactive: 'Ngừng hoạt động',
};

export interface UnitItem {
  readonly id: string;
  readonly unitCode: string;
  readonly unitName: string;
  readonly symbol?: string | null;
  readonly quantityPrecision: number;
  readonly description?: string | null;
  readonly status: string;
}

export interface CategoryItem {
  readonly id: string;
  readonly parentCategoryId?: string | null;
  readonly categoryCode: string;
  readonly categoryName: string;
  readonly description?: string | null;
  readonly status: string;
  readonly level: number;
  readonly categoryPath: string;
  readonly hasChildren: boolean;
}

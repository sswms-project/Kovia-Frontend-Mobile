export type SupplierStatus = 'Active' | 'Inactive';

export const SUPPLIER_STATUS_LABEL: Readonly<Record<string, string>> = {
  Active: 'Đang hoạt động',
  Inactive: 'Ngừng hoạt động',
};

export interface Supplier {
  readonly id: string;
  readonly supplierCode: string;
  readonly supplierName: string;
  readonly phone: string;
  readonly taxCode?: string | null;
  readonly email?: string | null;
  readonly address?: string | null;
  readonly contactSalutation?: string | null;
  readonly contactName?: string | null;
  readonly contactEmail?: string | null;
  readonly contactMobile?: string | null;
  readonly contactChannelName?: string | null;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt?: string | null;
}

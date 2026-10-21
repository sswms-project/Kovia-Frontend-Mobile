export type RecipientStatus = 'Active' | 'Inactive';

export const RECIPIENT_STATUS_LABEL: Readonly<Record<string, string>> = {
  Active: 'Đang hoạt động',
  Inactive: 'Ngừng hoạt động',
};

export const RECIPIENT_TYPE_LABEL: Readonly<Record<string, string>> = {
  Organization: 'Tổ chức',
  Individual: 'Cá nhân',
};

export interface StockRecipient {
  readonly id: string;
  readonly recipientCode: string;
  readonly recipientName: string;
  readonly recipientType: string;
  readonly taxCode?: string | null;
  readonly phone: string;
  readonly email?: string | null;
  readonly address: string;
  readonly shippingAddress?: string | null;
  readonly contactSalutation?: string | null;
  readonly contactName?: string | null;
  readonly contactMobile?: string | null;
  readonly contactChannelName?: string | null;
  readonly status: string;
  readonly createdAt: string;
}

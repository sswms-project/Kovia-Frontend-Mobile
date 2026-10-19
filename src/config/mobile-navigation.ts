import { P } from './permission-codes';
import { USER_ROLES, type UserRole } from './roles';

// Mobile is built for floor work; owners and managers use the web app.
export const MOBILE_SUPPORTED_ROLES: readonly UserRole[] = [USER_ROLES.WarehouseStaff];

// `permission: null` means every signed-in, supported user sees the tab.
export const MOBILE_TABS = [
  {
    name: 'tasks',
    href: '/tasks',
    title: 'Công việc',
    permission: P.WAREHOUSE_TASKS_VIEW_OWN,
    icon: { sf: 'checklist', md: 'checklist' },
  },
  {
    name: 'inventory',
    href: '/inventory',
    title: 'Tồn kho',
    permission: P.INVENTORY_VIEW,
    icon: { sf: 'shippingbox', md: 'inventory_2' },
  },
  {
    name: 'notifications',
    href: '/notifications',
    title: 'Thông báo',
    permission: P.NOTIFICATIONS_VIEW,
    icon: { sf: 'bell', md: 'notifications' },
  },
  {
    // Hub for read-only catalogs; it lists only the entries the user may open (see LOOKUP_ENTRIES).
    name: 'lookup',
    href: '/lookup',
    title: 'Tra cứu',
    permission: null,
    icon: { sf: 'magnifyingglass', md: 'search' },
  },
  {
    name: 'profile',
    href: '/profile',
    title: 'Hồ sơ',
    permission: null,
    icon: { sf: 'person.crop.circle', md: 'person' },
  },
] as const;

export type MobileTab = (typeof MOBILE_TABS)[number];

// Each lookup feature adds one entry here; the Lookup tab shows those the user has permission for.
export const LOOKUP_ENTRIES = [
  {
    key: 'products',
    href: '/lookup/products',
    title: 'Sản phẩm',
    description: 'Tìm sản phẩm, xem mã vạch, lô và nhà cung cấp',
    permission: P.PRODUCTS_VIEW,
  },
] as const;

import { P } from './permission-codes';
import { USER_ROLES, type UserRole } from './roles';

// Operational roles can work on mobile; effective permissions still gate each action.
export const MOBILE_SUPPORTED_ROLES: readonly UserRole[] = [USER_ROLES.WarehouseStaff, USER_ROLES.WarehouseManager, USER_ROLES.TenantOwner];

// `permission: null` means every signed-in, supported user sees the tab.
export const MOBILE_TABS = [
  {
    name: 'index',
    href: '/',
    title: 'Trang chủ',
    permission: null,
    inNavbar: true,
    icon: { sf: 'house', md: 'home' },
  },
  {
    name: 'tasks',
    href: '/tasks',
    title: 'Công việc',
    permission: P.WAREHOUSE_TASKS_VIEW_OWN,
    inNavbar: true,
    icon: { sf: 'checklist', md: 'checklist' },
  },
  {
    name: 'scanner',
    href: '/scanner',
    title: 'Quét mã',
    permission: null,
    inNavbar: true,
    icon: { sf: 'barcode.viewfinder', md: 'qr_code_scanner' },
  },
  {
    name: 'inventory',
    href: '/inventory',
    title: 'Tồn kho',
    permission: P.INVENTORY_VIEW,
    inNavbar: true,
    icon: { sf: 'shippingbox', md: 'inventory_2' },
  },
  {
    // Hub for read-only catalogs; it lists only the entries the user may open (see LOOKUP_ENTRIES).
    // Not '/lookup': that path belongs to the stock lookup screen.
    name: 'catalog',
    href: '/catalog',
    title: 'Danh mục',
    permission: null,
    // Navbar stays at 5 items so the scan button is centered; add an entry point from the home screen.
    inNavbar: false,
    icon: { sf: 'magnifyingglass', md: 'search' },
  },
  {
    name: 'profile',
    href: '/profile',
    title: 'Hồ sơ',
    permission: null,
    inNavbar: true,
    icon: { sf: 'person.crop.circle', md: 'person' },
  },
] as const;

export type MobileTab = (typeof MOBILE_TABS)[number];

// Each lookup feature adds one entry here; the Lookup tab shows those the user has permission for.
export const LOOKUP_ENTRIES = [
  {
    key: 'discrepancies',
    href: '/catalog/discrepancies',
    title: 'Báo cáo chênh lệch',
    description: 'Theo dõi phản hồi và bổ sung bằng chứng tại kho',
    permission: P.INVENTORY_VIEW,
  },
  {
    key: 'warehouse-monitor',
    href: '/catalog/warehouse-monitor',
    title: 'Giám sát công việc',
    description: 'Tiến độ và lịch sử công việc của nhân viên trong kho',
    permission: P.WAREHOUSE_TASKS_VIEW_ALL,
  },
  {
    key: 'products',
    href: '/catalog/products',
    title: 'Sản phẩm',
    description: 'Tìm sản phẩm, xem mã vạch, lô và nhà cung cấp',
    permission: P.PRODUCTS_VIEW,
  },
  {
    key: 'suppliers',
    href: '/catalog/suppliers',
    title: 'Nhà cung cấp',
    description: 'Danh sách, liên hệ và gọi nhanh nhà cung cấp',
    permission: P.SUPPLIERS_VIEW,
  },
  {
    key: 'units',
    href: '/catalog/units',
    title: 'Đơn vị tính',
    description: 'Đơn vị tính và độ chính xác số lượng',
    permission: P.UNITS_VIEW,
  },
  {
    key: 'categories',
    href: '/catalog/categories',
    title: 'Loại sản phẩm',
    description: 'Cây phân loại sản phẩm',
    permission: P.CATEGORIES_VIEW,
  },
  {
    key: 'warehouses',
    href: '/catalog/warehouses',
    title: 'Kho',
    description: 'Thông tin các kho được giao',
    permission: P.WAREHOUSES_VIEW,
  },
  {
    key: 'inbound-requests',
    href: '/catalog/inbound-requests',
    title: 'Yêu cầu nhập kho',
    description: 'Theo dõi tiến độ nhận hàng của từng yêu cầu',
    permission: P.INBOUND_REQUESTS_VIEW,
  },
  {
    key: 'stock-issue-requests',
    href: '/catalog/stock-issue-requests',
    title: 'Yêu cầu xuất kho',
    description: 'Phiếu xuất, tiến độ lấy hàng và vị trí lấy',
    permission: P.STOCK_ISSUE_REQUESTS_VIEW,
  },
  {
    key: 'stock-recipients',
    href: '/catalog/stock-recipients',
    title: 'Đơn vị nhận hàng',
    description: 'Khách hàng nhận hàng xuất kho',
    permission: P.STOCK_RECIPIENTS_VIEW,
  },
  {
    key: 'goods-returns',
    href: '/catalog/goods-returns',
    title: 'Yêu cầu trả hàng',
    description: 'Trạng thái các yêu cầu trả hàng',
    permission: P.GOODS_RETURN_REQUESTS_VIEW,
  },
  {
    key: 'damage-cases',
    href: '/catalog/damage-cases',
    title: 'Hồ sơ hàng hỏng',
    description: 'Hàng hỏng đang giữ và đã xử lý',
    permission: P.INVENTORY_VIEW,
  },
  {
    key: 'reports',
    href: '/catalog/reports',
    title: 'Báo cáo',
    description: 'Tồn kho, tiến độ nhập xuất và công việc',
    permission: P.REPORTS_VIEW,
  },
  {
    key: 'audit-logs',
    href: '/catalog/audit-logs',
    title: 'Nhật ký hoạt động',
    description: 'Người thực hiện, thời điểm và thay đổi trong phạm vi được phép',
    permission: P.AUDIT_LOGS_VIEW,
  },
] as const;

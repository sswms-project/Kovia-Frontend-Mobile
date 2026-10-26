import { Stack } from 'expo-router';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMe } from '@/features/auth/hooks/use-me';
import { USER_ROLES } from '@/config/roles';

export default function LookupLayout() {
  const theme = useTheme();
  const staff = useMe().data?.role === USER_ROLES.WarehouseStaff;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.primary,
        headerTitleStyle: { fontFamily: FontFamily.semibold, color: theme.text },
        headerShadowVisible: false,
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="products/index" options={{ title: 'Sản phẩm' }} />
      <Stack.Screen name="products/[productId]" options={{ title: 'Chi tiết sản phẩm' }} />
      <Stack.Screen name="products/scan" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="suppliers/index" options={{ title: 'Nhà cung cấp' }} />
      <Stack.Screen name="suppliers/[supplierId]" options={{ title: 'Chi tiết nhà cung cấp' }} />
      <Stack.Screen name="units" options={{ title: 'Đơn vị tính' }} />
      <Stack.Screen name="categories" options={{ title: 'Loại sản phẩm' }} />
      <Stack.Screen name="warehouses/index" options={{ title: 'Kho' }} />
      <Stack.Screen name="warehouses/[warehouseId]" options={{ title: 'Chi tiết kho' }} />
      <Stack.Screen name="warehouses/locations" options={{ title: 'Vị trí kho' }} />
      <Stack.Screen name="inbound-requests/index" options={{ title: 'Yêu cầu nhập kho' }} />
      <Stack.Screen name="inbound-requests/[requestId]" options={{ title: 'Chi tiết yêu cầu nhập kho' }} />
      <Stack.Screen name="stock-issue-requests/index" options={{ title: 'Yêu cầu xuất kho' }} />
      <Stack.Screen name="stock-issue-requests/[requestId]" options={{ title: 'Chi tiết yêu cầu xuất kho' }} />
      <Stack.Screen name="stock-recipients/index" options={{ title: 'Đơn vị nhận hàng' }} />
      <Stack.Screen name="stock-recipients/[recipientId]" options={{ title: 'Chi tiết đơn vị nhận hàng' }} />
      <Stack.Screen name="goods-returns/index" options={{ title: 'Yêu cầu trả hàng' }} />
      <Stack.Screen name="goods-returns/[returnId]" options={{ title: 'Chi tiết yêu cầu trả hàng' }} />
      <Stack.Screen name="stock-adjustments/index" options={{ title: 'Điều chỉnh tồn kho' }} />
      <Stack.Screen name="stock-adjustments/[adjustmentId]" options={{ title: 'Chi tiết phiếu điều chỉnh' }} />
      <Stack.Screen name="damage-cases" options={{ title: 'Hồ sơ hàng hỏng' }} />
      <Stack.Screen name="reports/index" options={{ title: 'Báo cáo' }} />
      <Stack.Screen name="reports/[reportType]" options={{ title: 'Báo cáo chi tiết' }} />
      <Stack.Screen name="audit-logs" options={{ title: staff ? 'Hoạt động của tôi' : 'Nhật ký hoạt động' }} />
      <Stack.Screen name="warehouse-monitor" options={{ title: 'Giám sát công việc' }} />
      <Stack.Screen name="transfers/index" options={{ title: 'Điều chuyển kho' }} />
      <Stack.Screen name="transfers/[id]" options={{ title: 'Chi tiết điều chuyển' }} />
      <Stack.Screen name="discrepancies/index" options={{ title: 'Báo cáo chênh lệch' }} />
      <Stack.Screen name="discrepancies/[id]" options={{ title: 'Chi tiết báo cáo' }} />
    </Stack>
  );
}

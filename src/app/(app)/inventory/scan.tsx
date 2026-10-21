import { useRouter } from 'expo-router';

import { ScannerScreen } from '@/features/scanner/screens/scanner-screen';

// Hands the scanned code back to the inventory list, which searches for it.
export default function InventoryScanRoute() {
  const router = useRouter();

  return (
    <ScannerScreen
      title="Quét mã sản phẩm"
      onClose={() => router.back()}
      onScan={(code) => {
        router.dismissTo({ pathname: '/inventory', params: { search: code } });
        return true;
      }}
    />
  );
}

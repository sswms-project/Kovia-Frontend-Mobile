import { useRouter } from 'expo-router';

import { ScannerScreen } from '@/features/scanner/screens/scanner-screen';

// Hands the scanned code back to the product list, which searches for it.
export default function ProductScanRoute() {
  const router = useRouter();

  return (
    <ScannerScreen
      title="Quét mã sản phẩm"
      onClose={() => router.back()}
      onScan={(code) => {
        router.dismissTo({ pathname: '/catalog/products', params: { search: code } });
        return true;
      }}
    />
  );
}

import { useFocusEffect, useRouter } from 'expo-router';
import { ScanBarcode } from 'lucide-react-native';
import { useCallback } from 'react';

import { EmptyState } from '@/components/ui/empty-state';

// Tab giữa navbar: mở màn quét (modal /scan) mỗi khi tab được chọn.
export default function ScannerTab() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      router.push('/scan');
    }, [router]),
  );

  return (
    <EmptyState
      fullScreen
      icon={ScanBarcode}
      title="Quét mã"
      description="Quét mã vạch hoặc QR để tra cứu nhanh."
      actionLabel="Mở camera"
      onAction={() => router.push('/scan')}
    />
  );
}

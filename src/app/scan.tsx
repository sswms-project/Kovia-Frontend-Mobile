import { useRouter } from 'expo-router';
import { toast } from 'sonner-native';

import { ScannerScreen } from '@/features/scanner/screens/scanner-screen';

// Stand-alone entry that echoes the code. Inbound, outbound and stocktake flows render
// ScannerScreen themselves with their own onScan instead of going through this route.
export default function ScanRoute() {
  const router = useRouter();

  return (
    <ScannerScreen
      title="Quét mã"
      onClose={() => router.back()}
      onScan={(code) => {
        toast.success(`Đã quét: ${code}`);
        return true;
      }}
    />
  );
}

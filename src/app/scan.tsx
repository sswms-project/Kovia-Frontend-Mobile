import { useRouter } from 'expo-router';

import { ScannerScreen } from '@/features/scanner/screens/scanner-screen';

export default function ScanRoute() {
  const router = useRouter();

  return (
    <ScannerScreen
      title="Quét mã"
      onClose={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }}
      onScan={(code) => {
        router.dismissTo({ pathname: '/inventory/lookup', params: { code,
          kind: code.toUpperCase().startsWith('KOVIA:LOC:') ? 'Location' : 'Product', scanId: String(Date.now()) } });
        return true;
      }}
    />
  );
}

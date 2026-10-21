import { useLocalSearchParams } from 'expo-router';
import { Boxes } from 'lucide-react-native';

import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';
import { InventoryScreen } from '@/features/inventory/screens/inventory-screen';
import { TabPlaceholder } from '@/features/navigation/components/tab-placeholder';

export default function InventoryRoute() {
  const { search } = useLocalSearchParams<{ search?: string }>();
  const allowed = useCan(P.INVENTORY_VIEW);

  // Without view permission the list would only produce 403s, so explain it up front.
  if (!allowed) {
    return (
      <TabPlaceholder
        allowed={false}
        icon={Boxes}
        title="Tồn kho"
        description="Tra cứu tồn kho và vị trí hàng hóa sẽ hiển thị tại đây."
      />
    );
  }

  // Keyed by the scanned code so a new scan remounts the screen with the code as its search text.
  return <InventoryScreen key={search ?? ''} initialSearch={search ?? ''} />;
}

import { Boxes } from 'lucide-react-native';

import { P } from '@/config/permission-codes';
import { useCan } from '@/features/auth/hooks/use-can';
import { TabPlaceholder } from '@/features/navigation/components/tab-placeholder';

export default function InventoryRoute() {
  const allowed = useCan(P.INVENTORY_VIEW);

  return (
    <TabPlaceholder
      allowed={allowed}
      icon={Boxes}
      title="Tồn kho"
      description="Tra cứu tồn kho và vị trí hàng hóa sẽ hiển thị tại đây."
    />
  );
}

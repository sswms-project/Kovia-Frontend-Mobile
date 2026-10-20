import { getRoleLabel } from '@/config/roles';

import type { UserProfile } from '../auth.types';
import { DetailText } from './auth-form';

export function ProfileDetails({ profile }: { profile: UserProfile }) {
  return (
    <>
      <DetailText>
        {profile.email} · {profile.role ? getRoleLabel(profile.role) : 'Chưa có vai trò'}
      </DetailText>
      <DetailText>
        Email: {profile.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'}
        {'\n'}Xác thực hai bước: {profile.isTwoFactorEnabled ? 'Đang bật' : 'Đang tắt'}
      </DetailText>
      <DetailText>
        Kho được phân công:{' '}
        {profile.assignedWarehouses.length
          ? profile.assignedWarehouses
              .map((warehouse) => `${warehouse.warehouseCode} — ${warehouse.warehouseName}`)
              .join(', ')
          : 'Chưa được phân công kho'}
      </DetailText>
    </>
  );
}

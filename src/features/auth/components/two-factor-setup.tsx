import type { TwoFactorSetup } from '../auth.types';
import { DetailText } from './auth-form';

export function TwoFactorSetupDetails({ setup }: { setup: TwoFactorSetup }) {
  return (
    <>
      <DetailText>
        Trong ứng dụng Authenticator, thêm khóa thiết lập thủ công dưới đây rồi nhập mã 6 chữ số.
        Không chia sẻ khóa này. Phiên thiết lập có hiệu lực tối đa 10 phút.
      </DetailText>
      <DetailText>Khóa thiết lập: {setup.secret}</DetailText>
    </>
  );
}

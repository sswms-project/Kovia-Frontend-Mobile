import { useLocalSearchParams } from 'expo-router';

import { ResetPasswordScreen } from '@/features/auth/screens/reset-password-screen';

export default function ResetPasswordRoute() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <ResetPasswordScreen token={token} />;
}

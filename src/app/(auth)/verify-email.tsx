import { useLocalSearchParams } from 'expo-router';

import { VerifyEmailScreen } from '@/features/auth/screens/verify-email-screen';

export default function VerifyEmailRoute() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return <VerifyEmailScreen token={token} />;
}

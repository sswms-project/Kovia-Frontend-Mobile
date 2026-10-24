import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/auth.store';

// "/" only exists under the signed-in group; signed-out users land here, so send them to login.
export default function NotFound() {
  const signedIn = useAuth((state) => state.signedIn);
  return <Redirect href={signedIn ? '/' : '/login'} />;
}

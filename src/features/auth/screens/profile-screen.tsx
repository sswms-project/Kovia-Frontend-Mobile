import { useState } from 'react';

import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';

import { useAuth } from '../auth.store';
import { ProfileSummary } from '../components/profile-summary';
import { useMe } from '../hooks/use-me';

export function ProfileScreen() {
  const me = useMe();
  const signOut = useAuth((state) => state.signOut);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }

  if (me.isPending) return <LoadingState fullScreen />;
  if (me.isError) {
    return <ErrorState fullScreen error={me.error} onRetry={() => void me.refetch()} />;
  }

  return (
    <ProfileSummary
      profile={me.data}
      isSigningOut={isSigningOut}
      onSignOut={() => void handleSignOut()}
    />
  );
}

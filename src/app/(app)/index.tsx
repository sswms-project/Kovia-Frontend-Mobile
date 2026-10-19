import { Redirect } from 'expo-router';

import { getAllowedTabs } from '@/features/auth/auth.permissions';
import { useMe } from '@/features/auth/hooks/use-me';

// The (app) layout only renders its tabs once /auth/me has loaded, so `data` is set here.
export default function IndexRoute() {
  const { data } = useMe();
  const firstTab = data ? getAllowedTabs(data)[0] : undefined;

  return <Redirect href={firstTab?.href ?? '/profile'} />;
}

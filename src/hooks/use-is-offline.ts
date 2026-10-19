import { useNetworkState } from 'expo-network';

/** Fields are undefined until the first reading, which must not flash an offline banner. */
export function useIsOffline(): boolean {
  const state = useNetworkState();
  return state.isConnected === false || state.isInternetReachable === false;
}

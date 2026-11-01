import { randomUUID } from 'expo-crypto';

// Correlates this app session's writes with delayed realtime events; never used for authorization.
export const transferClientId = randomUUID();

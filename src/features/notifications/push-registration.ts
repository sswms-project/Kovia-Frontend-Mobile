import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

const ANDROID_CHANNEL = 'tasks';

let registeredToken: string | null = null;

// App đang mở thì AI đã đọc to công việc mới; chỉ hiện banner, không phát thêm tiếng.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Xin quyền, lấy Expo push token và đăng ký với BE. Trả về null nếu thiếu điều kiện (emulator, chưa cấp quyền, chưa có EAS projectId). */
export async function registerForPush(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Công việc được giao',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return null;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.post('/notifications/device-tokens', { token, platform: Platform.OS });
  registeredToken = token;
  return token;
}

/** Gọi trước khi xóa phiên để BE ngừng gửi push cho tài khoản này trên thiết bị. */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await api.post('/notifications/device-tokens/unregister', { token });
}
